# RESOLVE-ONE: Translation & Legal Linguistic Review Register

This document registers all localized strings across English (`en`), Hindi (`hi`), and Telugu (`te`) that require specialized verification by bilingual consumer law specialists and professional translators.

---

## 1. High-Sensitivity Statutory Terminology

| String Key / Concept | English Term | Current Hindi (`hi`) | Current Telugu (`te`) | Review Guidance & Statutory Context |
| :--- | :--- | :--- | :--- | :--- |
| `status.resolved` | *Outcome confirmed* | समाधान की पुष्टि हुई | పరిష్కారం నిర్ధారించబడింది | Must never imply judicial finality; must strictly indicate the consumer's verification of money in bank or replacement in hand. |
| `status.waiting_company` | *Waiting for company* | कंपनी के जवाब का इंतज़ार | కంపెనీ కోసం వేచి చూస్తున్నారు | Captures the commercial turnaround window before statutory escalation. |
| `legal.cpa_2019` | *Consumer Protection Act, 2019* | उपभोक्ता संरक्षण अधिनियम, 2019 | వినియోగదారుల పరిరక్షణ చట్టం, 2019 | Official statutory title under Ministry of Consumer Affairs, Food & Public Distribution. |
| `legal.nch` | *National Consumer Helpline (1915)* | राष्ट्रीय उपभोक्ता हेल्पलाइन (1915) | జాతీయ వినియోగదారుల హెల్ప్‌లైన్ (1915) | Verify dialect suitability for rural Telangana and Andhra Pradesh. |
| `legal.ejagriti` | *e-Jagriti / e-Daakhil Portal* | ई-जाग्रति / ई-दाखिल पोर्टल | ఇ-జాగృతి / ఇ-దాఖిల్ పోర్టల్ | Formal filing portal before Consumer Commissions under Section 35 of CPA 2019. |
| `legal.rbi_ombudsman` | *RBI Integrated Ombudsman* | आरबीआई एकीकृत लोकपाल | ఆర్బీఐ ఇంటిగ్రేటెడ్ అంబుడ్స్‌మన్ | Verify terminology regarding failed UPI reversal turnaround (T+1 to T+5 days). |

---

## 2. Honesty Guardrail Disclaimers

The following disclosures must retain unambiguous clarity across all languages without losing plain-spoken authority:

### Disclaimer 1: Non-Legal Advice
- **English:** *"General informational guidance, not legal advice. Direct all formal legal disputes through official Consumer Commissions under Consumer Protection Act, 2019."*
- **Hindi:** *"सामान्य सूचनात्मक मार्गदर्शन, कानूनी सलाह नहीं। सभी औपचारिक कानूनी विवाद उपभोक्ता संरक्षण अधिनियम, 2019 के तहत आधिकारिक उपभोक्ता आयोगों के माध्यम से दायर करें।"*
- **Telugu:** *"సాధారణ సమాచార మార్గదర్శకత్వం మాత్రమే, చట్టపరమైన సలహా కాదు. అన్ని అధికారిక చట్టపరమైన వివాదాలను వినియోగదారుల పరిరక్షణ చట్టం, 2019 కింద అధికారిక వినియోగదారుల కమిషన్ల ద్వారా మాత్రమే దాఖలు చేయండి."*
- **Status:** **Ready for Legal Counsel Sign-off.**

### Disclaimer 2: Three-State Outcome Veracity
- **English:** *"Never confuse a company promise with money received. Always compare with your bank or UPI transaction statement before confirming."*
- **Hindi:** *"कंपनी के वादे को खाते में पैसे आने से अलग रखें। पुष्टि करने से पहले हमेशा अपने बैंक या यूपीआई लेनदेन विवरण से मिलान करें।"*
- **Telugu:** *"కంపెనీ మాటలను మీ ఖాతాలో నగదు జమ అయినట్లుగా భావించవద్దు. నిర్ధారించే ముందు ఎల్లప్పుడూ మీ బ్యాంక్ లేదా UPI స్టేట్‌మెంట్‌తో సరిచూడండి."*
- **Status:** **Verified by Product & Honesty Principles.**

### Disclaimer 3: Rule-Based Extraction vs. Fake AI
- **English:** *"Suggested from your words (local rule-based parsing, not AI)"*
- **Hindi:** *"आपके शब्दों से सुझाए गए तथ्य (स्थानीय नियम-आधारित पार्सिंग, कोई कृत्रिम बुद्धिमत्ता/AI नहीं)"*
- **Telugu:** *"మీ మాటల ఆధారంగా గుర్తించిన వివరాలు (స్థానిక నిబంధనల ఆధారంగా, నకిలీ AI కాదు)"*
- **Status:** **Approved.**

---

## 3. Localization Verification Checklist
- [x] ICU plurals and currency formatting handled via `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
- [x] Self-hosted font subsets covering Devanagari (`Noto Sans Devanagari`) and Telugu (`Noto Sans Telugu`) with `font-display: swap`.
- [x] Right-to-left layout not required for Hindi/Telugu; standard reading order confirmed.
- [x] Minimum 16px font size enforced across all regional languages to ensure diacritic legibility (Matras in Hindi and Vattulu in Telugu).

