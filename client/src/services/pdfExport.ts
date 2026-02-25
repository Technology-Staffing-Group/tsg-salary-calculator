// ============================================================
// PDF Export Service - Generates professional PDFs for all modes
// ============================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EmployeeResult, B2BResult, AllocationResult } from '../types';

const DISCLAIMER = 'This calculator provides estimates based on current tax rules and rates. Results are for planning only and must be validated by a tax professional.';

function formatNum(n: number): string {
  return n.toLocaleString('en-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function addHeader(doc: jsPDF, title: string) {
  // TSG Logo area
  doc.setFillColor(214, 0, 28);
  doc.rect(14, 10, 8, 8, 'F');
  doc.setFillColor(0, 0, 0);
  doc.rect(18, 10, 8, 8, 'F');
  doc.setFillColor(214, 0, 28);
  doc.triangle(18, 14, 22, 10, 22, 18, 'F');

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('TSG', 30, 17);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Technology Staffing Group', 50, 17);

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(45, 45, 45);
  doc.text(title, 14, 30);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}`, 14, 36);

  return 42;
}

function addDisclaimer(doc: jsPDF, y: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y > pageHeight - 30) {
    doc.addPage();
    y = 20;
  }
  doc.setFillColor(255, 248, 230);
  doc.rect(14, y, 182, 16, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 100, 50);
  doc.text('Disclaimer: ' + DISCLAIMER, 16, y + 6, { maxWidth: 178 });
  return y + 20;
}

const countryNames: Record<string, string> = { CH: 'Switzerland', RO: 'Romania', ES: 'Spain' };

export function exportEmployeePDF(result: EmployeeResult, inputs: any) {
  const doc = new jsPDF();
  let y = addHeader(doc, 'Employee Mode - Salary Calculation');

  // Input Summary
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(45, 45, 45);
  doc.text('Input Summary', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Parameter', 'Value']],
    body: [
      ['Country', `${countryNames[result.country] || result.country} (${result.currency})`],
      ['Calculation Basis', inputs.calculationBasis],
      ['Input Amount', `${formatNum(inputs.amount)} ${result.currency} (${inputs.period})`],
      ['Occupation Rate', `${result.occupationRate}%`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [45, 45, 45] },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Results Summary
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Calculation Results', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['', 'Monthly', 'Yearly']],
    body: [
      ['Gross Salary', `${formatNum(result.grossSalaryMonthly)} ${result.currency}`, `${formatNum(result.grossSalaryYearly)} ${result.currency}`],
      ['Net Salary', `${formatNum(result.netSalaryMonthly)} ${result.currency}`, `${formatNum(result.netSalaryYearly)} ${result.currency}`],
      ['Total Employer Cost', `${formatNum(result.totalEmployerCostMonthly)} ${result.currency}`, `${formatNum(result.totalEmployerCostYearly)} ${result.currency}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [214, 0, 28] },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Employee Contributions
  if (result.employeeContributions.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Contributions', 14, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [['Contribution', 'Rate', 'Base', 'Amount']],
      body: [
        ...result.employeeContributions.map(c => [
          c.name,
          `${(c.rate * 100).toFixed(2)}%`,
          `${formatNum(c.base)} ${result.currency}`,
          `${formatNum(c.amount)} ${result.currency}`,
        ]),
        ...(result.incomeTax !== undefined ? [['Income Tax', `${result.country === 'RO' ? '10%' : 'Progressive'}`, `${formatNum(result.taxableBase || 0)} ${result.currency}`, `${formatNum(result.incomeTax)} ${result.currency}`]] : []),
        ['TOTAL', '', '', `${formatNum(result.totalEmployeeContributions)} ${result.currency}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100] },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Employer Contributions
  if (result.employerContributions.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Employer Contributions', 14, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [['Contribution', 'Rate', 'Base', 'Amount']],
      body: [
        ...result.employerContributions.map(c => [
          c.name,
          `${(c.rate * 100).toFixed(3)}%`,
          `${formatNum(c.base)} ${result.currency}`,
          `${formatNum(c.amount)} ${result.currency}`,
        ]),
        ['TOTAL', '', '', `${formatNum(result.totalEmployerContributions)} ${result.currency}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100] },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Business Metrics
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Business Metrics', 14, y);
  y += 5;

  const metricsBody = [
    ['Employer Daily Rate', `${formatNum(result.dailyRate)} ${result.currency}`],
  ];
  if (result.marginVsClientRate !== undefined) {
    metricsBody.push(['Margin vs Client Rate', `${formatNum(result.marginVsClientRate)} ${result.currency}`]);
  }

  autoTable(doc, {
    startY: y,
    body: metricsBody,
    theme: 'grid',
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  addDisclaimer(doc, y);

  doc.save(`TSG_Employee_${result.country}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportB2BPDF(result: B2BResult, inputs: any) {
  const doc = new jsPDF();
  let y = addHeader(doc, 'B2B Mode - Contractor Cost Analysis');

  // Input Summary
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Input Summary', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Parameter', 'Value']],
    body: [
      ['Cost Rate', `${formatNum(inputs.costRate)} ${result.currency}/${inputs.rateType?.toLowerCase() || 'day'}`],
      ['Pricing Mode', inputs.pricingMode],
      ['Currency', result.currency],
    ],
    theme: 'grid',
    headStyles: { fillColor: [45, 45, 45] },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Results
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Profitability Analysis', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ['Client Daily Rate', `${formatNum(result.clientRateDaily)} ${result.currency}`],
      ['Cost Daily Rate', `${formatNum(result.costRateDaily)} ${result.currency}`],
      ['Daily Margin', `${formatNum(result.marginAmount)} ${result.currency}`],
      ['Margin %', `${result.marginPercent.toFixed(1)}%`],
      ['Markup %', `${result.markupPercent.toFixed(1)}%`],
      ['Annual Revenue', `${formatNum(result.annualRevenue)} ${result.currency}`],
      ['Annual Cost', `${formatNum(result.annualCost)} ${result.currency}`],
      ['Annual Profit', `${formatNum(result.annualProfit)} ${result.currency}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [214, 0, 28] },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  addDisclaimer(doc, y);

  doc.save(`TSG_B2B_${result.currency}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportAllocationPDF(result: AllocationResult, inputs: any) {
  const doc = new jsPDF();
  let y = addHeader(doc, 'Allocation Mode - Multi-Client Profitability');

  // Input Summary
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Input Summary', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Parameter', 'Value']],
    body: [
      ['Base Salary (100%)', `${formatNum(inputs.salary100)} ${result.currency}`],
      ['Engagement %', `${inputs.engagementPercent}%`],
      ['Employer Multiplier', `${inputs.employerMultiplier}x`],
      ['Working Days/Year', `${result.workingDaysPerYear}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [45, 45, 45] },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Cost Breakdown
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Cost Breakdown', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    body: [
      ['Engaged Salary', `${formatNum(result.engagedSalary)} ${result.currency}`],
      ['Total Employer Cost', `${formatNum(result.employerCost)} ${result.currency}`],
      ['Base Daily Cost', `${formatNum(result.baseDailyCost)} ${result.currency}`],
    ],
    theme: 'grid',
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Client Analysis
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Client Profitability', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Client', 'Allocation', 'Daily Rate', 'Revenue/Day', 'Profit/Day', 'Type', 'Annual Profit']],
    body: result.clients.map(c => [
      c.clientName,
      `${c.allocationPercent}%`,
      `${formatNum(c.dailyRate)} ${result.currency}`,
      `${formatNum(c.revenuePerDay)} ${result.currency}`,
      `${formatNum(c.profitPerDay)} ${result.currency}`,
      c.isBaseline ? 'Baseline' : 'Incremental',
      `${formatNum(c.annualProfit)} ${result.currency}`,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [214, 0, 28], fontSize: 7 },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Totals
  autoTable(doc, {
    startY: y,
    head: [['Summary', 'Value']],
    body: [
      ['Total Daily Profit', `${formatNum(result.totalDailyProfit)} ${result.currency}`],
      ['Total Annual Profit', `${formatNum(result.annualProfit)} ${result.currency}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [46, 134, 193] },
    styles: { fontSize: 10, fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  addDisclaimer(doc, y);

  doc.save(`TSG_Allocation_${result.currency}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
