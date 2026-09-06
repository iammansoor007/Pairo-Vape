/**
 * TaxService
 * 
 * Completely independent from ShippingService. Handles all tax calculations
 * for the U Vape Storefront. Reads configuration from TaxSettings model.
 */

import dbConnect   from '@/lib/db';
import TaxSettings from '@/models/TaxSettings';

class TaxService {
  /**
   * Fetch tax settings for a tenant. Returns a safe defaults object if not configured.
   * @param {string} tenantId
   * @returns {Promise<object>}
   */
  async getTaxSettings(tenantId) {
    await dbConnect();
    const settings = await TaxSettings.findOne({ tenantId }).lean();
    return settings ?? {
      tenantId,
      enabled:           false,
      taxLabel:          'Tax',
      defaultTaxRate:    0,
      calculationMethod: 'exclusive',
      taxRoundingMode:   'round',
      applyToShipping:   false,
      taxRules:          []
    };
  }

  /**
   * Find the applicable tax rate for a given address.
   * Per-region rules are checked first; falls back to defaultTaxRate.
   * 
   * @param {object} taxSettings - TaxSettings document
   * @param {{ country?: string, state?: string, city?: string }} address
   * @returns {number} Applicable rate as a percentage (e.g. 17 for 17%)
   */
  getApplicableRate(taxSettings, address = {}) {
    if (!taxSettings.enabled || !taxSettings.defaultTaxRate) return 0;

    const rules = [...(taxSettings.taxRules ?? [])].sort((a, b) => b.priority - a.priority);

    for (const rule of rules) {
      const ruleRegion = rule.region.toLowerCase().trim();
      const compareValue = (() => {
        switch (rule.rateType) {
          case 'city':    return (address.city || '').toLowerCase().trim();
          case 'state':   return (address.state || '').toLowerCase().trim();
          case 'country': return (address.country || '').toLowerCase().trim();
          default:        return '';
        }
      })();
      if (compareValue && compareValue === ruleRegion) {
        return rule.rate;
      }
    }

    return taxSettings.defaultTaxRate;
  }

  /**
   * Calculate tax amount for a given subtotal and optional shipping cost.
   * 
   * @param {number} subtotal      - Cart subtotal (after discounts)
   * @param {number} shippingCost  - Shipping cost
   * @param {object} taxSettings   - TaxSettings document
   * @param {object} [address]     - Customer address for per-region rule lookup
   * @returns {{
   *   taxAmount: number,
   *   effectiveRate: number,
   *   taxLabel: string,
   *   breakdown: { onSubtotal: number, onShipping: number }
   * }}
   */
  calculateTax(subtotal, shippingCost = 0, taxSettings, address = {}) {
    if (!taxSettings.enabled) {
      return { taxAmount: 0, effectiveRate: 0, taxLabel: taxSettings.taxLabel ?? 'Tax', breakdown: { onSubtotal: 0, onShipping: 0 } };
    }

    const rate = this.getApplicableRate(taxSettings, address);
    if (rate === 0) {
      return { taxAmount: 0, effectiveRate: 0, taxLabel: taxSettings.taxLabel, breakdown: { onSubtotal: 0, onShipping: 0 } };
    }

    const applyRounding = (value) => {
      switch (taxSettings.taxRoundingMode) {
        case 'floor': return Math.floor(value);
        case 'ceil':  return Math.ceil(value);
        default:      return Math.round(value);
      }
    };

    const taxOnSubtotal  = applyRounding((subtotal  * rate) / 100);
    const taxOnShipping  = taxSettings.applyToShipping ? applyRounding((shippingCost * rate) / 100) : 0;
    const taxAmount      = taxOnSubtotal + taxOnShipping;

    return {
      taxAmount,
      effectiveRate: rate,
      taxLabel:      taxSettings.taxLabel,
      breakdown: {
        onSubtotal: taxOnSubtotal,
        onShipping: taxOnShipping
      }
    };
  }
}

export const taxService = new TaxService();
export default TaxService;
