const BaseService = require('./base.service');
const ValidationUtils = require('../utils/validation.util');

class JournalService extends BaseService {
 
  async createJournalEntry(data, tx) {
    const client = this.getTx(tx);
    const {
      businessId,
      entryDate,
      referenceType,
      referenceId,
      description,
      lines,
      userId
    } = data;

    ValidationUtils.validateRequired(businessId, 'Business ID');
    ValidationUtils.validateRequired(entryDate, 'Entry Date');
    ValidationUtils.validateRequired(lines, 'Journal Lines');

    if (lines.length < 2) {
      throw new Error('Journal entry must have at least 2 lines');
    }

    // Validate balance
    this.validateBalance(lines);

    // Create entry with lines
    return await client.journalEntry.create({
      data: {
        businessId,
        entryDate: new Date(entryDate),
        referenceType,
        referenceId,
        description,
        createdBy: userId,
        isPosted: false,
        lines: {
          create: lines.map(line => ({
            accountId: line.accountId,
            partyId: line.partyId,
            debitAmount: line.debitAmount || 0,
            creditAmount: line.creditAmount || 0,
            description: line.description
          }))
        }
      },
      include: {
        lines: true
      }
    });
  }

  /**
   * Post journal entry (update account balances)
   * @param {string} journalEntryId 
   * @param {Object} [tx] 
   */
  async postJournalEntry(journalEntryId, tx) {
    const client = this.getTx(tx);

    const entry = await client.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { lines: { include: { account: true } } }
    });

    if (!entry) throw new Error('Journal entry not found');
    if (entry.isPosted) throw new Error('Journal entry already posted');

    // Update account balances
    for (const line of entry.lines) {
      if (!line.accountId) continue;

      const account = line.account;
      // Determine balance change based on NormalBalance type would be ideal, 
      // but for now we follow the schema's raw debit/credit.
      // Typically:
      // Assist/Expense (Debit Normal): Balance = Debit - Credit
      // Liability/Equity/Income (Credit Normal): Balance = Credit - Debit
      
      // However, the specific logic depends on how we want to store 'currentBalance'.
      // If we blindly add/subtract, we need to know the account type.
      // Let's fetch account type normal balance.
      const accountType = await client.accountType.findUnique({
        where: { id: account.accountTypeId }
      });

      let change = 0;
      const debit = Number(line.debitAmount);
      const credit = Number(line.creditAmount);

      if (accountType.normalBalance === 'DEBIT') {
        change = debit - credit;
      } else {
        change = credit - debit;
      }

      await client.account.update({
        where: { id: line.accountId },
        data: {
          currentBalance: {
            increment: change
          }
        }
      });

      // Update party balance if applicable
      if (line.partyId) {
        // Party balance logic also depends on PartyType
        // Debtor: Debit increases, Credit decreases
        // Creditor: Credit increases, Debit decreases
        // We need to fetch party to know type
        const party = await client.party.findUnique({
          where: { id: line.partyId }
        });

        let partyChange = 0;
        if (party.partyType === 'DEBTOR') {
          partyChange = debit - credit;
        } else {
          // Creditor / Employee
          partyChange = credit - debit;
        }

        await client.party.update({
          where: { id: line.partyId },
          data: {
            currentBalance: {
              increment: partyChange
            }
          }
        });
      }
    }

    // Mark as posted
    return await client.journalEntry.update({
      where: { id: journalEntryId },
      data: {
        isPosted: true,
        postedAt: new Date()
      }
    });
  }

  validateBalance(lines) {
    const totalDebit = lines.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + Number(line.creditAmount || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Journal entry unbalanced: Debits ${totalDebit} != Credits ${totalCredit}`);
    }
  }
}

module.exports = JournalService;
