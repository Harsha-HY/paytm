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
    # Safe formatting
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
        "active_language": language,
        "active_script": target_script,
        "kannada": kn_text,
        "hindi": hi_text,
        "tamil": ta_text,
        "telugu": te_text,
        "english": en_text,
        "metrics": {
            "gross_amount": gross_amount,
            "net_settlement": net_settlement,
            "total_deductions": total_deductions,
            "mdr_amount": mdr_amount,
            "gst_amount": gst_amount,
            "claimable_itc": gst_amount,
            "is_simulated": True
        }
    }
