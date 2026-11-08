import { chromium } from 'playwright';
import path from 'path';

async function generateSampleIndicPdfs() {
  const artifactDir = '/Users/karthiknaramala/.gemini/antigravity/brain/63962a62-75d6-46fa-a706-24c32fe88b07';
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();

  // 1. Hindi Sample Proof Pack
  const hindiHtml = `
  <!DOCTYPE html>
  <html lang="hi">
  <head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: 'Noto Sans Devanagari', 'Inter', sans-serif;
        padding: 40px;
        color: #1a1a1a;
        background: #ffffff;
        max-width: 800px;
        margin: 0 auto;
        line-height: 1.6;
      }
      .header-bar {
        height: 4px;
        background: #C8372D;
        margin-bottom: 24px;
      }
      .brand-title {
        font-size: 20px;
        font-weight: 700;
        color: #111;
        letter-spacing: -0.5px;
      }
      .meta-line {
        font-size: 11px;
        color: #666;
        margin-top: 4px;
        padding-bottom: 16px;
        border-bottom: 1px solid #e5e5e5;
      }
      .summary-box {
        background: #FAF8F4;
        border: 1px solid #E7E2D8;
        border-radius: 8px;
        padding: 18px 20px;
        margin: 20px 0;
      }
      .section-heading {
        font-size: 13px;
        font-weight: 700;
        color: #C8372D;
        text-transform: uppercase;
        margin-bottom: 12px;
        letter-spacing: 0.5px;
      }
      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px 24px;
        font-size: 12px;
      }
      .fact-label {
        font-weight: 600;
        color: #444;
      }
      .section-title {
        font-size: 14px;
        font-weight: 700;
        color: #111;
        margin-top: 24px;
        margin-bottom: 8px;
        border-bottom: 1px solid #eee;
        padding-bottom: 6px;
      }
      .desc-text {
        font-size: 12.5px;
        color: #333;
        background: #fdfdfd;
        padding: 12px;
        border-left: 3px solid #C8372D;
        margin-bottom: 20px;
      }
      .timeline-item {
        font-size: 11.5px;
        padding: 8px 0;
        border-bottom: 1px dashed #eee;
      }
      .timeline-date {
        font-weight: 600;
        color: #222;
      }
      .evidence-card {
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        padding: 10px 14px;
        margin-bottom: 8px;
        font-size: 11px;
      }
      .hash-code {
        font-family: monospace;
        color: #666;
        font-size: 10px;
        background: #f5f5f5;
        padding: 2px 6px;
        border-radius: 4px;
        display: inline-block;
        margin-top: 4px;
      }
      .footer-notice {
        margin-top: 36px;
        padding-top: 12px;
        border-top: 1px solid #eee;
        font-size: 10px;
        color: #888;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="header-bar"></div>
    <div class="brand-title">RESOLVE-ONE · उपभोक्ता शिकायत निवारण प्रूफ पैक</div>
    <div class="meta-line">केस आईडी: RS-89241 &nbsp;|&nbsp; दिनांक: 09 नवं 2026 &nbsp;|&nbsp; क्षेत्राधिकार: भारत (उपभोक्ता संरक्षण अधिनियम, 2019)</div>

    <div class="summary-box">
      <div class="section-heading">विवाद सारांश (DISPUTE SUMMARY)</div>
      <div class="grid-2">
        <div><span class="fact-label">कंपनी / विक्रेता:</span> Flipkart India Private Limited</div>
        <div><span class="fact-label">समस्या श्रेणी:</span> धनवापसी (रिफंड) प्राप्त नहीं हुआ</div>
        <div><span class="fact-label">सामान का विवरण:</span> Noise Pulse 2 Smartwatch (Jet Black)</div>
        <div><span class="fact-label">दावा राशि:</span> ₹3,499 (तीन हजार चार सौ निन्यानवे रुपये)</div>
        <div><span class="fact-label">ऑर्डर संदर्भ संख्या:</span> OD492019481029410</div>
        <div><span class="fact-label">अपेक्षित समाधान:</span> मूल बैंक खाते में पूर्ण रिफंड</div>
      </div>
    </div>

    <div class="section-title">तथ्यों का विवरण (STATEMENT OF FACTS)</div>
    <div class="desc-text">
      मैंने 02 नवंबर 2026 को फ्लिपकार्ट से ₹3,499 की स्मार्टवॉच ऑर्डर की थी। डिलीवरी के समय बॉक्स खुला था और उत्पाद की स्क्रीन टूटी हुई थी। मैंने उसी दिन 02 नवंबर को डिलीवरी बॉय के सामने वापसी (रिटर्न) का अनुरोध दर्ज कराया। 04 नवंबर को कूरियर एजेंट ने सामान वापस ले लिया, लेकिन आज तक मेरे बैंक खाते में रिफंड जमा नहीं हुआ है। विक्रेता के कस्टमर केयर से संपर्क करने पर कोई संतोषजनक जवाब नहीं मिला।
    </div>

    <div class="section-title">कालानुक्रमिक घटनाक्रम (CHRONOLOGICAL EVENT LOG)</div>
    <div class="timeline-item">
      <span class="timeline-date">• 02 नवं 2026 — उत्पाद डिलीवरी व दोष रिपोर्टिंग:</span> क्षतिग्रस्त स्मार्टवॉच प्राप्त हुई। डिलीवरी के 2 घंटे के भीतर फ्लिपकार्ट ऐप पर शिकायत दर्ज की।
    </div>
    <div class="timeline-item">
      <span class="timeline-date">• 04 नवं 2026 — कूरियर रिटर्न पिकअप:</span> एकार्ट लॉजिस्टिक्स द्वारा पिकअप पूर्ण। ट्रैकिंग रसीद संख्या: FMPC9920194।
    </div>
    <div class="timeline-item">
      <span class="timeline-date">• 06 नवं 2026 — कस्टमर केयर से बात:</span> कंपनी प्रतिनिधि ने 48 घंटे में समाधान का वादा किया, जो पूरा नहीं हुआ।
    </div>

    <div class="section-title">सबूत सूची व डिजिटल फिंगरप्रिंट (EVIDENCE INDEX & SHA-256 HASHES)</div>
    <div class="evidence-card">
      <strong>1. Flipkart_Tax_Invoice_OD4920.pdf</strong> (184.2 KB) — आधिकारिक कर बीजक<br>
      <span class="hash-code">SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</span>
    </div>
    <div class="evidence-card">
      <strong>2. Damaged_Screen_Photo.jpg</strong> (2.4 MB) — क्षतिग्रस्त स्क्रीन का प्रमाण फोटोग्राफ<br>
      <span class="hash-code">SHA-256: 8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4</span>
    </div>

    <div class="footer-notice">
      RESOLVE-ONE (resolve.one) द्वारा स्वनिर्मित उपभोक्ता साक्ष्य डोजियर। यह वैधानिक साक्ष्य रिकॉर्ड है, कानूनी प्रतिनिधित्व नहीं।
    </div>
  </body>
  </html>
  `;

  await page.setContent(hindiHtml, { waitUntil: 'networkidle' });
  await page.pdf({
    path: path.join(artifactDir, 'sample-hindi-proof-pack.pdf'),
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
  });
  console.log('✓ Generated sample-hindi-proof-pack.pdf');

  // 2. Telugu Sample Proof Pack
  const teluguHtml = `
  <!DOCTYPE html>
  <html lang="te">
  <head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: 'Noto Sans Telugu', 'Inter', sans-serif;
        padding: 40px;
        color: #1a1a1a;
        background: #ffffff;
        max-width: 800px;
        margin: 0 auto;
        line-height: 1.6;
      }
      .header-bar {
        height: 4px;
        background: #C8372D;
        margin-bottom: 24px;
      }
      .brand-title {
        font-size: 20px;
        font-weight: 700;
        color: #111;
        letter-spacing: -0.5px;
      }
      .meta-line {
        font-size: 11px;
        color: #666;
        margin-top: 4px;
        padding-bottom: 16px;
        border-bottom: 1px solid #e5e5e5;
      }
      .summary-box {
        background: #FAF8F4;
        border: 1px solid #E7E2D8;
        border-radius: 8px;
        padding: 18px 20px;
        margin: 20px 0;
      }
      .section-heading {
        font-size: 13px;
        font-weight: 700;
        color: #C8372D;
        text-transform: uppercase;
        margin-bottom: 12px;
        letter-spacing: 0.5px;
      }
      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px 24px;
        font-size: 12px;
      }
      .fact-label {
        font-weight: 600;
        color: #444;
      }
      .section-title {
        font-size: 14px;
        font-weight: 700;
        color: #111;
        margin-top: 24px;
        margin-bottom: 8px;
        border-bottom: 1px solid #eee;
        padding-bottom: 6px;
      }
      .desc-text {
        font-size: 12.5px;
        color: #333;
        background: #fdfdfd;
        padding: 12px;
        border-left: 3px solid #C8372D;
        margin-bottom: 20px;
      }
      .timeline-item {
        font-size: 11.5px;
        padding: 8px 0;
        border-bottom: 1px dashed #eee;
      }
      .timeline-date {
        font-weight: 600;
        color: #222;
      }
      .evidence-card {
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        padding: 10px 14px;
        margin-bottom: 8px;
        font-size: 11px;
      }
      .hash-code {
        font-family: monospace;
        color: #666;
        font-size: 10px;
        background: #f5f5f5;
        padding: 2px 6px;
        border-radius: 4px;
        display: inline-block;
        margin-top: 4px;
      }
      .footer-notice {
        margin-top: 36px;
        padding-top: 12px;
        border-top: 1px solid #eee;
        font-size: 10px;
        color: #888;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="header-bar"></div>
    <div class="brand-title">RESOLVE-ONE · వినియోగదారుల వివాద పరిష్కార ప్రూఫ్ ప్యాక్</div>
    <div class="meta-line">కేసు ఐడీ: RS-99381 &nbsp;|&nbsp; తేదీ: 09 నవం 2026 &nbsp;|&nbsp; అధికార పరిధి: భారతదేశం (వినియోగదారుల రక్షణ చట్టం, 2019)</div>

    <div class="summary-box">
      <div class="section-heading">వివాద సారాంశం (DISPUTE SUMMARY)</div>
      <div class="grid-2">
        <div><span class="fact-label">కంపెనీ / విక్రేత:</span> Amazon Seller Services India</div>
        <div><span class="fact-label">సమస్య రకం:</span> రీఫండ్ రాలేదు (చెల్లింపు వైఫల్యం)</div>
        <div><span class="fact-label">వస్తువు:</span> Sony WH-1000XM4 Headphones</div>
        <div><span class="fact-label">క్లెయిమ్ మొత్తం:</span> ₹19,990 (పందొమ్మిది వేల తొమ్మిది వందల తొంభై రూపాయలు)</div>
        <div><span class="fact-label">ఆర్డర్ రిఫరెన్స్ నంబర్:</span> 402-8819203-1928410</div>
        <div><span class="fact-label">కోరుకునే పరిష్కారం:</span> పూర్తి రీఫండ్ తక్షణ జమ</div>
      </div>
    </div>

    <div class="section-title">ఫిర్యాదు వాస్తవాలు (STATEMENT OF FACTS)</div>
    <div class="desc-text">
      నేను అమెజాన్ ఇండియాలో ₹19,990 చెల్లించి హెడ్‌ఫోన్‌లను ఆర్డర్ చేశాను. పార్శిల్ డెలివరీ అయినప్పుడు బాక్స్ ఖాళీగా ఉంది, అందులో హెడ్‌ఫోన్లు లేవు. వెంటనే కస్టమర్ కేర్‌కు ఫోన్ చేసి ఫిర్యాదు నమోదు చేశాను (#INC-99201). అమెజాన్ అంతర్గత విచారణ జరిపి రీఫండ్ మంజూరు చేస్తామని చెప్పింది, కానీ 10 రోజులు గడిచినా ఎటువంటి రీఫండ్ లేదా స్పందన రాలేదు. నా బ్యాంకు ఖాతాలో కూడా ఎలాంటి మొత్తం జమ కాలేదు.
    </div>

    <div class="section-title">కాలక్రమ ఈవెంట్ లాగ్ (CHRONOLOGICAL EVENT LOG)</div>
    <div class="timeline-item">
      <span class="timeline-date">• 28 అక్టో 2026 — ఆర్డర్ డెలివరీ:</span> ఖాళీ బాక్స్ డెలివరీ చేయబడింది. ఫోటోలు తీసి కస్టమర్ కేర్‌కు పంపడం జరిగింది.
    </div>
    <div class="timeline-item">
      <span class="timeline-date">• 30 అక్టో 2026 — ఈమెయిల్ ఫిర్యాదు:</span> ఆర్డర్ ఇన్‌వాయిస్ మరియు ఫోటోలతో కూడిన అధికారిక ఫిర్యాదు పంపబడింది.
    </div>
    <div class="timeline-item">
      <span class="timeline-date">• 04 నవం 2026 — పరిష్కార గడువు ముగింపు:</span> కంపెనీ హామీ ఇచ్చిన 5 రోజుల గడువు ముగిసింది. ఎటువంటి సమాధానం లేదు.
    </div>

    <div class="section-title">ఆధారాల జాబితా & క్రిప్టోగ్రాఫిక్ హాష్ (EVIDENCE INDEX & SHA-256 HASHES)</div>
    <div class="evidence-card">
      <strong>1. Amazon_Invoice_402-8819203.pdf</strong> (210.4 KB) — కొనుగోలు పన్ను రసీదు<br>
      <span class="hash-code">SHA-256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069</span>
    </div>
    <div class="evidence-card">
      <strong>2. Empty_Box_Unboxing_Video.mp4</strong> (14.2 MB) — పార్శిల్ ఓపెనింగ్ వీడియో రుజువు<br>
      <span class="hash-code">SHA-256: b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9</span>
    </div>

    <div class="footer-notice">
      RESOLVE-ONE (resolve.one) ద్వారా తయారు చేయబడిన వినియోగదారుల సాక్ష్యాధారాల నివేదిక. ఇది చట్టపరమైన ప్రాతినిధ్యం కాదు.
    </div>
  </body>
  </html>
  `;

  await page.setContent(teluguHtml, { waitUntil: 'networkidle' });
  await page.pdf({
    path: path.join(artifactDir, 'sample-telugu-proof-pack.pdf'),
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
  });
  console.log('✓ Generated sample-telugu-proof-pack.pdf');

  await browser.close();
}

generateSampleIndicPdfs().catch(console.error);
