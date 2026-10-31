from rules_engine import calculate_mdr

test_cases = [
    # Essential Sectors
    ("Essential Sectors", "Petrol Bunk / Fuel Station", 500, 0.0, 0.0, 500.0),
    ("Essential Sectors", "Petrol Bunk / Fuel Station", 2000, 0.0, 0.0, 2000.0),
    ("Essential Sectors", "Petrol Bunk / Fuel Station", 3000, 5.0, 0.90, 2994.10),
    ("Essential Sectors", "Petrol Bunk / Fuel Station", 5000, 5.0, 0.90, 4994.10),
    ("Essential Sectors", "Petrol Bunk / Fuel Station", 10000, 5.0, 0.90, 9994.10),
    ("Essential Sectors", "Petrol Bunk / Fuel Station", 50000, 5.0, 0.90, 49994.10),
    # Capital Markets
    ("Capital Markets", "Stockbrokers", 2000, 0.0, 0.0, 2000.0),
    ("Capital Markets", "Stockbrokers", 10000, 2.0, 0.36, 9997.64),
    ("Capital Markets", "Stockbrokers", 50000, 10.0, 1.80, 49988.20),
    ("Capital Markets", "Stockbrokers", 100000, 20.0, 3.60, 99976.40),
    ("Capital Markets", "Stockbrokers", 500000, 100.0, 18.00, 499882.00),
    ("Capital Markets", "Stockbrokers", 2000000, 300.0, 54.00, 1999646.00),
    # Part 4 Sample Transactions
    ("Essential Sectors", "Petrol Bunk", 3000, 5.0, 0.90, 2994.10),
    ("General Merchant", "Restaurant", 1500, 0.0, 0.0, 1500.0),
    ("General Merchant", "Pharmacy", 2500, 10.0, 1.80, 2488.20),
    ("General Merchant", "Clinic", 500, 0.0, 0.0, 500.0),
    ("Essential Sectors", "Telecom Recharge", 400, 0.0, 0.0, 400.0),
]

all_passed = True
print("=" * 85)
print(f"{'Category':<20} | {'Amount':<10} | {'MDR':<8} | {'GST':<8} | {'Net Settlement':<14} | {'Status'}")
print("=" * 85)
for cat, subcat, amt, exp_mdr, exp_gst, exp_net in test_cases:
    res = calculate_mdr(amt, cat, subcat)
    passed = (
        round(res['mdr_amount'], 2) == exp_mdr and
        round(res['gst_amount'], 2) == exp_gst and
        round(res['net_settlement'], 2) == exp_net
    )
    status_str = "PASS" if passed else "FAIL"
    if not passed:
        all_passed = False
    print(f"{cat} ({subcat[:10]}) | Rs.{amt:<8,} | Rs.{res['mdr_amount']:<6.2f} | Rs.{res['gst_amount']:<6.2f} | Rs.{res['net_settlement']:<12.2f} | {status_str}")

# Test P2P Exemption
p2p_res = calculate_mdr(10000, payment_type="P2P")
assert p2p_res['mdr_amount'] == 0.0 and p2p_res['gst_amount'] == 0.0
print(f"P2P Personal Transfer | Rs.10,000   | Rs.0.00   | Rs.0.00   | Rs.10,000.00   | PASS")

# Test P2PM Small Merchant Exemption
p2pm_res = calculate_mdr(5000, "General Retail", p2pm_eligible=True, monthly_eligible_receipts=75000.0)
assert p2pm_res['mdr_amount'] == 0.0 and p2pm_res['gst_amount'] == 0.0
print(f"P2PM Small Merchant   | Rs.5,000    | Rs.0.00   | Rs.0.00   | Rs.5,000.00    | PASS")

print("=" * 85)
print(f"Overall Result: {'100% ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
