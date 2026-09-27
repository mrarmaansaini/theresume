import { jsPDF } from 'jspdf';

const PAGE = { width: 210, height: 297, left: 18, right: 18, bottom: 18 };

function safeText(value) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
}

export function downloadScreeningPdf(record) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const width = PAGE.width - PAGE.left - PAGE.right;
  let y = 20;

  const ensureSpace = (height) => {
    if (y + height > PAGE.height - PAGE.bottom) {
      pdf.addPage();
      y = 19;
    }
  };

  const paragraph = (value, { size = 10, color = [63, 73, 67], gap = 3, bold = false } = {}) => {
    const text = safeText(value);
    if (!text) return;
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, width);
    const blockHeight = lines.length * (size * 0.43) + gap;
    ensureSpace(blockHeight);
    pdf.text(lines, PAGE.left, y);
    y += blockHeight;
  };

  const section = (heading, content) => {
    const text = safeText(content);
    if (!text) return;
    ensureSpace(12);
    y += 3;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(43, 91, 65);
    pdf.text(heading.toUpperCase(), PAGE.left, y);
    y += 5;
    pdf.setDrawColor(218, 230, 220);
    pdf.line(PAGE.left, y, PAGE.width - PAGE.right, y);
    y += 5;
    paragraph(text, { size: 9.5, color: [82, 91, 84], gap: 2 });
  };

  const listSection = (heading, items, formatItem = (item) => item) => {
    if (!items?.length) return;
    ensureSpace(12);
    y += 3;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(43, 91, 65);
    pdf.text(heading.toUpperCase(), PAGE.left, y);
    y += 6;
    items.forEach((item) => paragraph(`- ${formatItem(item)}`, { size: 9.5, gap: 2 }));
  };

  pdf.setFillColor(37, 76, 54);
  pdf.rect(0, 0, PAGE.width, 43, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.text('THE RESUME  /  LOGIC NINJAS', PAGE.left, 15);
  pdf.setFontSize(20);
  pdf.text('Candidate role assessment', PAGE.left, 26);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(224, 237, 226);
  pdf.text(`${safeText(record.candidateName) || 'Candidate'}  ·  ${safeText(record.jobTitle) || 'Target role'}`, PAGE.left, 34);
  y = 53;

  pdf.setFillColor(241, 247, 242);
  pdf.roundedRect(PAGE.left, y - 6, width, 18, 2, 2, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(44, 84, 59);
  pdf.text(`ROLE FIT: ${safeText(record.aiInsights?.fitLevel || record.band || 'Needs human review')}`, PAGE.left + 4, y + 1);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(76, 89, 79);
  pdf.text(`Evidence score: ${record.score == null ? 'Not available' : `${record.score}%`}  ·  Generated ${new Date(record.createdAt || Date.now()).toLocaleDateString()}`, PAGE.left + 4, y + 7);
  y += 18;

  paragraph(record.aiInsights?.summary || record.summary || 'This report summarizes visible role-related evidence. Not-evidenced skills are not proof of inability.', { size: 10, color: [63, 73, 67], gap: 2 });
  if (record.candidateEmail) paragraph(`Candidate email: ${record.candidateEmail}`, { size: 8.5, color: [112, 121, 114], gap: 2 });
  section('Target role description', record.jobDescription);
  listSection('Required and preferred skills', record.requirements, (item) => `${item.name} · ${item.priority === 'preferred' ? 'Preferred' : 'Required'} · ${item.found ? 'Evidence found' : 'Not evidenced'}${item.evidence ? ` · ${item.evidence}` : ''}`);
  listSection('Why the candidate may not yet fit', record.aiInsights?.concerns?.length ? record.aiInsights.concerns : (record.missingRequired || []).map((item) => `${item.name} was not evidenced in the resume.`));
  listSection('How to build the missing skills', record.aiInsights?.improvementPlan);
  listSection('Learning platforms', record.aiInsights?.learningResources, (item) => `${item.skill}: ${item.platform} (${item.url})${item.reason ? ` — ${item.reason}` : ''}`);
  listSection('Evidence from resume', record.aiInsights?.evidence);
  listSection('Web sources', record.aiInsights?.sources, (item) => `${item.title}: ${item.url}`);
  paragraph('Advisory report only. Resume text may omit relevant experience. A human reviewer must verify evidence and apply consistent, job-related criteria. Do not use this score as the sole basis for an employment decision.', { size: 8, color: [113, 121, 115], gap: 0 });

  const pageCount = pdf.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    pdf.setPage(pageNumber);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(145, 153, 147);
    pdf.text('THE RESUME BY LOGIC NINJAS · PRIVATE CANDIDATE REPORT', PAGE.left, PAGE.height - 9);
    pdf.text(`${pageNumber} / ${pageCount}`, PAGE.width - PAGE.right, PAGE.height - 9, { align: 'right' });
  }

  const fileBase = safeText(record.candidateName || 'candidate').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'candidate';
  pdf.save(`${fileBase}-role-assessment.pdf`);
}

export function downloadComparisonPdf(records) {
  if (!records?.length) return;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const width = PAGE.width - PAGE.left - PAGE.right;
  let y = 20;

  const ensureSpace = (height) => {
    if (y + height > PAGE.height - PAGE.bottom) {
      pdf.addPage();
      y = 19;
    }
  };

  const paragraph = (value, { size = 10, color = [63, 73, 67], gap = 3, bold = false } = {}) => {
    const text = safeText(value);
    if (!text) return;
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, width);
    const blockHeight = lines.length * (size * 0.43) + gap;
    ensureSpace(blockHeight);
    pdf.text(lines, PAGE.left, y);
    y += blockHeight;
  };

  const sectionHeading = (heading) => {
    ensureSpace(12);
    y += 3;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(43, 91, 65);
    pdf.text(heading.toUpperCase(), PAGE.left, y);
    y += 5;
    pdf.setDrawColor(218, 230, 220);
    pdf.line(PAGE.left, y, PAGE.width - PAGE.right, y);
    y += 5;
  };

  // Header Banner
  pdf.setFillColor(37, 76, 54);
  pdf.rect(0, 0, PAGE.width, 43, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.text('THE RESUME  /  LOGIC NINJAS', PAGE.left, 15);
  pdf.setFontSize(18);
  pdf.text('Side-by-Side Candidate Comparison', PAGE.left, 26);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(224, 237, 226);
  pdf.text(`Comparing ${records.length} candidate profiles  ·  Generated ${new Date().toLocaleDateString()}`, PAGE.left, 34);
  y = 52;

  // Candidate Summary Cards
  sectionHeading('Executive Candidate Overview');
  const cardWidth = (width - (records.length - 1) * 4) / records.length;
  records.forEach((record, index) => {
    const startX = PAGE.left + index * (cardWidth + 4);
    pdf.setFillColor(245, 248, 246);
    pdf.roundedRect(startX, y, cardWidth, 34, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(34, 45, 38);
    pdf.text(safeText(record.candidateName).slice(0, 20), startX + 3, y + 6);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(90, 102, 94);
    pdf.text(safeText(record.jobTitle).slice(0, 25), startX + 3, y + 11);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(33, 130, 95);
    pdf.text(record.score == null ? '—' : `${record.score}%`, startX + 3, y + 21);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(80, 92, 84);
    pdf.text(`Exp: ${record.resumeYears ?? '—'} yrs · Skills: ${record.matchedCount ?? (record.matchedSkills || []).length}/${(record.requirements || []).length}`, startX + 3, y + 28);
  });
  y += 40;

  // Key Skills Matrix
  sectionHeading('Skill Alignment Matrix');
  const allSkills = [...new Set(records.flatMap((r) => (r.requirements || []).map((req) => req.name)))];
  const colW = (width - 55) / records.length;

  // Table header
  pdf.setFillColor(235, 242, 237);
  pdf.rect(PAGE.left, y, width, 7, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(43, 60, 50);
  pdf.text('Skill / Competency', PAGE.left + 3, y + 5);
  records.forEach((r, idx) => {
    pdf.text(safeText(r.candidateName).slice(0, 14), PAGE.left + 55 + idx * colW + 2, y + 5);
  });
  y += 8;

  allSkills.slice(0, 24).forEach((skill, sIdx) => {
    ensureSpace(6);
    if (sIdx % 2 === 1) {
      pdf.setFillColor(250, 252, 250);
      pdf.rect(PAGE.left, y, width, 5.5, 'F');
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(60, 70, 64);
    pdf.text(skill.slice(0, 32), PAGE.left + 3, y + 4);

    records.forEach((r, idx) => {
      const found = (r.requirements || []).some((item) => item.name === skill && item.found);
      pdf.setFont('helvetica', found ? 'bold' : 'normal');
      pdf.setTextColor(found ? 36 : 180, found ? 140 : 70, found ? 95 : 80);
      pdf.text(found ? '✓ Evidenced' : '— Missing', PAGE.left + 55 + idx * colW + 2, y + 4);
    });
    y += 5.5;
  });

  y += 5;
  // Key Strengths & Gaps
  sectionHeading('AI Fit & Suggested Follow-up Probes');
  records.forEach((r) => {
    ensureSpace(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(37, 76, 54);
    pdf.text(`• ${safeText(r.candidateName)} (${r.score == null ? 'Unscored' : `${r.score}% Match`})`, PAGE.left, y);
    y += 4.5;
    if (r.aiInsights?.summary) {
      paragraph(r.aiInsights.summary, { size: 8, color: [75, 85, 78], gap: 2 });
    }
    const gaps = r.missingRequired || [];
    if (gaps.length) {
      paragraph(`Focus verification questions on: ${gaps.slice(0, 4).map((g) => g.name).join(', ')}`, { size: 7.5, color: [140, 90, 40], gap: 3 });
    }
  });

  const pageCount = pdf.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    pdf.setPage(pageNumber);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(145, 153, 147);
    pdf.text('THE RESUME BY LOGIC NINJAS · MULTI-CANDIDATE COMPARISON MATRIX', PAGE.left, PAGE.height - 9);
    pdf.text(`${pageNumber} / ${pageCount}`, PAGE.width - PAGE.right, PAGE.height - 9, { align: 'right' });
  }

  pdf.save(`candidate-comparison-${records.length}-profiles.pdf`);
}
