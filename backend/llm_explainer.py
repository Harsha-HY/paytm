from typing import Dict, Any, Optional

def generate_vernacular_story(
    merchant_name: str,
    business_name: str,
    gross_amount: float,
    mdr_amount: float,
    gst_amount: float,
    total_deductions: float,
    net_settlement: float,
    transactions_count: int = 1,
    chargeable_txns_count: int = 0,
    cap_applied: bool = False,
    language: str = "Kannada"
) -> Dict[str, Any]:
    """
    Transforms deterministic financial calculations into empathetic, conversational,
    vernacular audio scripts. All figures are strictly derived from verified rules engine data.
    """
    gross_str = f"₹{gross_amount:,.2f}"
    net_str = f"₹{net_settlement:,.2f}"
    diff_str = f"₹{total_deductions:,.2f}"
    fee_str = f"₹{mdr_amount:,.2f}"
    gst_str = f"₹{gst_amount:,.2f}"

    # Kannada Script
    if total_deductions == 0.0:
        kn_text = (
            f"ನಮಸ್ಕಾರ {merchant_name} ಅವರೇ, ಇಂದು ನಿಮ್ಮ {business_name} ಅಂಗಡಿಗೆ {gross_str} ಪಾವತಿ ಜಮೆಯಾಗಿದೆ. "
            f"ಎಲ್ಲಾ ಪಾವತಿಗಳು ₹2,000 ಒಳಗಿರುವುದರಿಂದ ಯಾವುದೇ MDR ಅಥವಾ GST ಕಡಿತವಿಲ್ಲದೆ ಪೂರ್ಣ {net_str} ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಜಮೆಯಾಗಿದೆ."
        )
    else:
        kn_text = (
            f"ನಮಸ್ಕಾರ {merchant_name} ಅವರೇ, ಇಂದು ನಿಮ್ಮ ಅಂಗಡಿಯ {gross_str} ಮಾರಾಟಕ್ಕೆ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ {net_str} ಜಮೆಯಾಗಿದೆ. "
            f"ಒಟ್ಟು {diff_str} ವ್ಯತ್ಯಾಸವಿದ್ದು, ₹2,000 ಕ್ಕಿಂತ ಹೆಚ್ಚಿನ {chargeable_txns_count or 1} ದೊಡ್ಡ ಪಾವತಿಗಳ ಮೇಲೆ "
            f"{fee_str} UPI MDR ಶುಲ್ಕ ಹಾಗೂ {gst_str} GST ಕಡಿತಗೊಂಡಿದೆ. ಈ {gst_str} GST ಮೊತ್ತವನ್ನು ನೀವು ನಿಮ್ಮ GST ರಿಟರ್ನ್ಸ್‌ನಲ್ಲಿ "
            f"ಇನ್‌ಪುಟ್ ಟ್ಯಾಕ್ಸ್ ಕ್ರೆಡಿಟ್ (ITC) ಆಗಿ ಕ್ಲೈಮ್ ಮಾಡಿಕೊಳ್ಳಬಹುದು."
        )

    # Hindi Script
    if total_deductions == 0.0:
        hi_text = (
            f"नमस्ते {merchant_name} जी, आज आपकी दुकान {business_name} में कुल {gross_str} के पेमेंट्स आए हैं। "
            f"सभी लेन-देन ₹2,000 से कम होने के कारण बिना किसी कटौती के पूरे {net_str} आपके बैंक खाते में क्रेडिट हो चुके हैं।"
        )
    else:
        hi_text = (
            f"नमस्ते {merchant_name} जी, आज आपकी दुकान के {gross_str} के पेमेंट्स के बदले बैंक खाते में {net_str} प्राप्त हुए हैं। "
            f"कुल {diff_str} की कटौती हुई है, जिसमें ₹2,000 से अधिक के {chargeable_txns_count or 1} बड़े पेमेंट्स पर "
            f"{fee_str} का UPI MDR शुल्क और {gst_str} का 18% GST शामिल है। यह {gst_str} GST आप इनपुट टैक्स क्रेडिट (ITC) के रूप में क्लेम कर सकते हैं।"
        )

    # Tamil Script
    if total_deductions == 0.0:
        ta_text = (
            f"வணக்கம் {merchant_name}, இன்று உங்கள் {business_name} வணிகத்திற்கு வந்த {gross_str} தொகையும் "
            f"எந்தவித பிடித்தமும் இன்றி முழுமையாக {net_str} உங்கள் வங்கிக் கணக்கில் வரவு வைக்கப்பட்டுள்ளது."
        )
    else:
        ta_text = (
            f"வணக்கம் {merchant_name}, இன்று உங்கள் {gross_str} விற்பனைக்கு வங்கிக் கணக்கில் {net_str} வரவு வைக்கப்பட்டுள்ளது. "
            f"மொத்தம் {diff_str} பிடித்தம் செய்யப்பட்டுள்ளது: இதில் UPI கட்டணம் {fee_str} மற்றும் ஜிஎஸ்டி {gst_str} அடங்கும். "
            f"இந்த {gst_str} ஜிஎஸ்டியை நீங்கள் இன்புட் டேக்ஸ் கிரெடிட்டாக திரும்பப் பெறலாம்."
        )

    # Telugu Script
    if total_deductions == 0.0:
        te_text = (
            f"నమస్కారం {merchant_name} గారు, ఈరోజు మీ {business_name} దుకాణానికి వచ్చిన {gross_str} మొత్తం "
            f"ఎటువంటి రుసుము లేకుండా పూర్తిగా {net_str} మీ బ్యాంక్ ఖాతాలో జమ చేయబడింది."
        )
    else:
        te_text = (
            f"నమస్కారం {merchant_name} గారు, ఈరోజు మీ {gross_str} అమ్మకాలకు బ్యాంక్ ఖాతాలో {net_str} జమ అయ్యింది. "
            f"మొత్తం {diff_str} మినహాయించబడింది. ఇందులో UPI రుసుము {fee_str} మరియు 18% GST {gst_str} ఉన్నాయి. "
            f"ఈ {gst_str} GSTని మీరు ఇన్‌పుట్ ట్యాక్స్ క్రెడిట్ రూపంలో క్లెయిమ్ చేసుకోవచ్చు."
        )

    # English Script
    if total_deductions == 0.0:
        en_text = (
            f"Hello {merchant_name}, today you received {gross_str} in QR sales at {business_name}. "
            f"Since all transactions were ₹2,000 or below, zero MDR was charged, and the full {net_str} has been credited to your bank account."
        )
    else:
        en_text = (
            f"Hello {merchant_name}, today you received {net_str} into your bank account from {gross_str} in QR sales. "
            f"The shortfall of {diff_str} consists of {fee_str} in UPI MDR fees on payments above ₹2,000, "
            f"and {gst_str} in 18% GST. You can claim the full {gst_str} as GST Input Tax Credit."
        )

    # Select target active script
    target_script = kn_text
    lang_lower = language.lower()
    if "hindi" in lang_lower:
        target_script = hi_text
    elif "tamil" in lang_lower:
        target_script = ta_text
    elif "telugu" in lang_lower:
        target_script = te_text
    elif "english" in lang_lower:
        target_script = en_text

    return {
        "active_script": target_script,
        "kannada": kn_text,
        "hindi": hi_text,
        "tamil": ta_text,
        "telugu": te_text,
        "english": en_text,
        "metrics": {
            "gross_formatted": gross_str,
            "net_formatted": net_str,
            "deductions_formatted": diff_str,
            "mdr_formatted": fee_str,
            "gst_formatted": gst_str,
            "transactions_count": transactions_count,
            "chargeable_count": chargeable_txns_count
        }
    }

def explain_single_transaction(
    amount: float,
    category: str,
    subcategory: Optional[str],
    mdr_rate: str,
    mdr_amount: float,
    gst_amount: float,
    net_settlement: float,
    rule_name: str,
    p2pm_eligible: bool = False
) -> Dict[str, str]:
    """
    Generates structured AI merchant assistant explanations in English, Hindi, and Kannada.
    Strictly grounded in rules engine calculation data.
    """
    amt_str = f"₹{amount:,.2f}"
    mdr_str = f"₹{mdr_amount:,.2f}"
    gst_str = f"₹{gst_amount:,.2f}"
    net_str = f"₹{net_settlement:,.2f}"

    # English
    if mdr_amount == 0.0:
        if p2pm_eligible:
            en_exp = f"You received a payment of {amt_str}. Under the small-merchant P2PM policy (monthly receipts ≤ ₹1 Lakh), this transaction receives a 0% MDR concession. No MDR or GST was deducted. Your expected settlement is {net_str}."
        else:
            en_exp = f"You received a payment of {amt_str}. Under the configured {category} demo rule ({rule_name}), transactions up to ₹2,000 carry 0% MDR. No fees were deducted. Your expected settlement is {net_str}."
    else:
        en_exp = f"You received a payment of {amt_str}. Based on the configured {category} demo rule ({rule_name}), the MDR is {mdr_rate}, which equals {mdr_str}. Estimated GST (18%) is {gst_str}. Total deduction is ₹{mdr_amount + gst_amount:,.2f}. Your expected settlement is {net_str}."

    # Hindi
    if mdr_amount == 0.0:
        if p2pm_eligible:
            hi_exp = f"आपको {amt_str} का भुगतान प्राप्त हुआ। छोटे व्यापारी P2PM नियम (मासिक आय ≤ ₹1 लाख) के तहत इस पर 0% MDR लागू हुआ है। कोई MDR या GST नहीं काटा गया। आपकी अपेक्षित सेटलमेंट राशि {net_str} है।"
        else:
            hi_exp = f"आपको {amt_str} का भुगतान प्राप्त हुआ। {category} श्रेणी के नियमानुसार ₹2,000 तक के लेन-देन पर 0% MDR छूट लागू है। कोई शुल्क नहीं काटा गया। आपकी अपेक्षित सेटलमेंट राशि {net_str} है।"
    else:
        hi_exp = f"आपको {amt_str} का भुगतान प्राप्त हुआ। कॉन्फ़िगर किए गए {category} नियम के तहत {mdr_rate} MDR शुल्क ({mdr_str}) और 18% अनुमानित GST ({gst_str}) लागू हुआ है। कुल कटौती ₹{mdr_amount + gst_amount:,.2f} है। आपकी अपेक्षित शुद्ध सेटलमेंट राशि {net_str} है।"

    # Kannada
    if mdr_amount == 0.0:
        if p2pm_eligible:
            kn_exp = f"ನಿಮಗೆ {amt_str} ಪಾವತಿ ಸ್ವೀಕೃತವಾಗಿದೆ. ಸಣ್ಣ ವ್ಯಾಪಾರಿ P2PM ನಿಯಮದ ಅಡಿಯಲ್ಲಿ (ಮಾಸಿಕ ರಸೀದಿ ≤ ₹1 ಲಕ್ಷ) 0% MDR ರಿಯಾಯಿತಿ ದೊರೆತಿದೆ. ಯಾವುದೇ ಶುಲ್ಕ ಅಥವಾ GST ಕಡಿತವಿಲ್ಲದೆ ಪೂರ್ಣ {net_str} ನಿಮ್ಮ ನಿರೀಕ್ಷಿತ ಜಮಾ ಮೊತ್ತವಾಗಿದೆ."
        else:
            kn_exp = f"ನಿಮಗೆ {amt_str} ಪಾವತಿ ಸ್ವೀಕೃತವಾಗಿದೆ. {category} ವರ್ಗದ ನಿಯಮದ ಪ್ರಕಾರ ₹2,000 ವರೆಗಿನ ವಹಿವಾಟುಗಳಿಗೆ 0% MDR ಇರುವುದರಿಂದ ಯಾವುದೇ ಕಡಿತವಿಲ್ಲದೆ ಪೂರ್ಣ {net_str} ನಿಮ್ಮ ನಿರೀಕ್ಷಿತ ಜಮಾ ಮೊತ್ತವಾಗಿದೆ."
    else:
        kn_exp = f"ನಿಮಗೆ {amt_str} ಪಾವತಿ ಸ್ವೀಕೃತವಾಗಿದೆ. ನಿಯೋಜಿತ {category} ನಿಯಮದ ಪ್ರಕಾರ {mdr_rate} MDR ಶುಲ್ಕ {mdr_str} ಹಾಗೂ ಅಂದಾಜು 18% GST {gst_str} ಕಡಿತವಾಗಿದೆ. ಒಟ್ಟು ಕಡಿತ ₹{mdr_amount + gst_amount:,.2f}. ನಿಮ್ಮ ನಿರೀಕ್ಷಿತ ಜಮಾ ಮೊತ್ತ {net_str}."

    return {
        "english": en_exp,
        "hindi": hi_exp,
        "kannada": kn_exp
    }

def generate_dispute_letter(
    merchant_name: str,
    business_name: str,
    acquiring_bank: str,
    merchant_bank: str,
    qr_provider: str,
    txn_id: str,
    gross_amount: float,
    expected_mdr: float,
    actual_deducted_mdr: float,
    expected_gst: float,
    actual_deducted_gst: float,
    language: str = "English"
) -> Dict[str, str]:
    """
    Generates a formal dispute draft letter for the merchant to submit to their acquiring bank or QR provider.
    """
    diff_mdr = round(actual_deducted_mdr - expected_mdr, 2)
    diff_gst = round(actual_deducted_gst - expected_gst, 2)
    total_overcharge = round(diff_mdr + diff_gst, 2)

    # English Letter
    en_letter = f"""Date: {datetime_now_str()}
To,
The Nodal Officer / Merchant Support Desk
{acquiring_bank} / {qr_provider}

Subject: Formal Dispute — Discrepancy & Overcharge in UPI Merchant Settlement (Txn ID: {txn_id})

Respected Sir/Madam,

I am writing on behalf of '{business_name}' (Proprietor: {merchant_name}) regarding an erroneous deduction observed during settlement reconciliation for transaction ID {txn_id}.

Transaction Summary:
- Transaction ID: {txn_id}
- Gross Customer Payment: ₹{gross_amount:,.2f}
- Settled To Bank Account: {merchant_bank}
- Payment / QR Provider: {qr_provider}
- Acquiring Bank: {acquiring_bank}

Discrepancy Details:
- Expected MDR as per applicable policy: ₹{expected_mdr:,.2f}
- Actual MDR Deducted: ₹{actual_deducted_mdr:,.2f} (Discrepancy: ₹{diff_mdr:,.2f})
- Expected Estimated GST (18%): ₹{expected_gst:,.2f}
- Actual GST Deducted: ₹{actual_deducted_gst:,.2f} (Discrepancy: ₹{diff_gst:,.2f})
- Total Erroneous Overcharge Claimed: ₹{total_overcharge:,.2f}

According to our verified merchant categorization and the official UPI merchant pricing schedule, this deduction exceeds the prescribed limit.

We request you to kindly investigate this settlement mismatch and credit the excess deducted amount of ₹{total_overcharge:,.2f} back to our registered settlement bank account within three (3) working days.

Sincerely,
{merchant_name}
Authorized Signatory, {business_name}
Settlement Bank: {merchant_bank}
"""

    # Hindi Letter
    hi_letter = f"""दिनांक: {datetime_now_str()}
सेवा में,
नोडल अधिकारी / मर्चेंट सपोर्ट डेस्क
{acquiring_bank} / {qr_provider}

विषय: यूपीआई मर्चेंट सेटलमेंट में अधिक कटौती/विसंगति के संबंध में औपचारिक शिकायत (लेन-देन आईडी: {txn_id})

महोदय/महोदया,

मैं '{business_name}' के अधिकृत प्रतिनिधि {merchant_name} के रूप में यह पत्र लेन-देन संख्या {txn_id} में हुई अनधिकृत कटौती के संबंध में लिख रहा हूँ।

लेन-देन का विवरण:
- लेन-देन आईडी: {txn_id}
- कुल ग्राहक भुगतान: ₹{gross_amount:,.2f}
- सेटलमेंट बैंक: {merchant_bank}
- क्यूआर प्रदाता: {qr_provider}

कटौती में विसंगति:
- नियमानुसार देय MDR: ₹{expected_mdr:,.2f}
- काटा गया MDR: ₹{actual_deducted_mdr:,.2f} (अंतर: ₹{diff_mdr:,.2f})
- नियमानुसार देय GST: ₹{expected_gst:,.2f}
- काटा गया GST: ₹{actual_deducted_gst:,.2f} (अंतर: ₹{diff_gst:,.2f})
- कुल अधिक काटी गई राशि: ₹{total_overcharge:,.2f}

अतः आपसे अनुरोध है कि उक्त सेटलमेंट विसंगति की जांच कर अधिक काटी गई ₹{total_overcharge:,.2f} की राशि हमारे बैंक खाते में 3 कार्य दिवसों के भीतर पुनः जमा करने की कृपा करें।

भवदीय,
{merchant_name}
{business_name}
"""

    # Kannada Letter
    kn_letter = f"""ದಿನಾಂಕ: {datetime_now_str()}
ಇವರಿಗೆ,
ನೋಡಲ್ ಅಧಿಕಾರಿ / ಮರ್ಚೆಂಟ್ ಸಪೋರ್ಟ್ ಡೆಸ್ಕ್
{acquiring_bank} / {qr_provider}

ವಿಷಯ: ಯುಪಿಐ ಮರ್ಚೆಂಟ್ ಸೆಟಲ್‌ಮೆಂಟ್‌ನಲ್ಲಿ ಅಧಿಕ ಕಡಿತ ಹಾಗೂ ತಕರಾರು ಕುರಿತು ಅರ್ಜಿ (ವಹಿವಾಟು ಐಡಿ: {txn_id})

ಮಾನ್ಯರೇ,

ನಾನು '{business_name}' ಸಂಸ್ಥೆಯ ಪರವಾಗಿ ({merchant_name}) ವಹಿವಾಟು ಸಂಖ್ಯೆ {txn_id} ರಲ್ಲಿ ನಿಯಮಬಾಹಿರವಾಗಿ ಕಡಿತಗೊಳಿಸಲಾದ MDR ಶುಲ್ಕದ ಕುರಿತು ಈ ತಕರಾರು ಅರ್ಜಿಯನ್ನು ಸಲ್ಲಿಸುತ್ತಿದ್ದೇನೆ.

ವಹಿವಾಟಿನ ವಿವರಗಳು:
- ವಹಿವಾಟು ಸಂಖ್ಯೆ: {txn_id}
- ಗ್ರಾಹಕರು ಪಾವತಿಸಿದ ಒಟ್ಟು ಮೊತ್ತ: ₹{gross_amount:,.2f}
- ಸೆಟಲ್‌ಮೆಂಟ್ ಬ್ಯಾಂಕ್: {merchant_bank}
- ಕ್ಯೂಆರ್ ಒದಗಿಸಿದವರು: {qr_provider}

ವ್ಯತ್ಯಾಸದ ವಿವರ:
- ನಿಯಮಾನುಸಾರ ನಿರೀಕ್ಷಿತ MDR: ₹{expected_mdr:,.2f}
- ಕಡಿತಗೊಳಿಸಲಾದ MDR: ₹{actual_deducted_mdr:,.2f} (ವ್ಯತ್ಯಾಸ: ₹{diff_mdr:,.2f})
- ನಿರೀಕ್ಷಿತ GST: ₹{expected_gst:,.2f}
- ಕಡಿತಗೊಳಿಸಲಾದ GST: ₹{actual_deducted_gst:,.2f} (ವ್ಯತ್ಯಾಸ: ₹{diff_gst:,.2f})
- ಒಟ್ಟು ಅಧಿಕ ಕಡಿತಗೊಂಡ ಮೊತ್ತ: ₹{total_overcharge:,.2f}

ಆದ್ದರಿಂದ, ದಯವಿಟ್ಟು ಈ ಸೆಟಲ್‌ಮೆಂಟ್ ವ್ಯತ್ಯಾಸವನ್ನು ಪರಿಶೀಲಿಸಿ, ಅಧಿಕವಾಗಿ ಕಡಿತಗೊಂಡ ₹{total_overcharge:,.2f} ಮೊತ್ತವನ್ನು ನಮ್ಮ ನೋಂದಾಯಿತ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ 3 ಕೆಲಸದ ದಿನಗಳೊಳಗೆ ಮರುಪಾವತಿಸಲು ಕೋರುತ್ತೇನೆ.

ಧನ್ಯವಾದಗಳೊಂದಿಗೆ,
{merchant_name}
{business_name}
"""

    return {
        "english": en_letter,
        "hindi": hi_letter,
        "kannada": kn_letter,
        "overcharge_amount": total_overcharge
    }

def datetime_now_str() -> str:
    from datetime import datetime
    return datetime.now().strftime("%d-%b-%Y")
