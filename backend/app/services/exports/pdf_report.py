"""PDF report generation with ReportLab (all 14 sections from the spec)."""

import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.core.disclaimer import DISCLAIMER

styles = getSampleStyleSheet()
H1 = styles["Heading1"]
H2 = styles["Heading2"]
BODY = styles["BodyText"]
WARN = ParagraphStyle("warn", parent=BODY, textColor=colors.HexColor("#8a1f1f"), fontSize=8)


def _bullets(items: list[str]) -> list:
    return [Paragraph(f"\u2022 {item}", BODY) for item in items]


def _kv_table(rows: list[tuple[str, str]]) -> Table:
    table = Table([[Paragraph(f"<b>{k}</b>", BODY), Paragraph(str(v), BODY)] for k, v in rows],
                  colWidths=[6 * cm, 10 * cm])
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return table


def build_pdf(project, analysis, scenario, estimate) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, title=f"GeoAI Preliminary Plan - {project.name}")
    design = scenario.design_output_json or {}
    calc = design.get("calculated", {})
    story = []

    # 1. Cover page
    story.append(Spacer(1, 5 * cm))
    story.append(Paragraph("GeoAI 3D Construction Planner", H1))
    story.append(Paragraph(f"Preliminary Planning Report: {project.name}", H2))
    story.append(Paragraph(f"Project type: {project.project_type.title()} | Units: {project.units}", BODY))
    story.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", BODY))
    story.append(Spacer(1, 2 * cm))
    story.append(Paragraph(DISCLAIMER, WARN))
    story.append(PageBreak())

    # 2. Project summary
    story.append(Paragraph("2. Project Summary", H2))
    story.append(Paragraph(design.get("summary", "No design generated yet."), BODY))
    story.append(_kv_table([
        ("Location", project.location_name or f"{project.center_lat}, {project.center_lng}"),
        ("Status", project.status),
        ("AI provider", design.get("ai_provider", "-")),
    ]))

    # 3 & 4. Map / model placeholders
    story.append(Paragraph("3. Location Map", H2))
    story.append(Paragraph("[Location map image placeholder - view interactive map in the application]", BODY))
    story.append(Paragraph("4. 3D Model", H2))
    story.append(Paragraph("[3D model screenshot placeholder - view interactive model in the application]", BODY))

    # 5. Site analysis
    story.append(Paragraph("5. Site Analysis", H2))
    if analysis is not None:
        story.append(_kv_table([
            ("Area", f"{analysis.area_sqm:,.0f} sqm" if analysis.area_sqm else "n/a"),
            ("Perimeter", f"{analysis.perimeter_m:,.0f} m" if analysis.perimeter_m else "n/a"),
            ("Elevation range", f"{analysis.elevation_min_m} - {analysis.elevation_max_m} m"),
            ("Slope estimate", f"{analysis.slope_percent_estimate}%"),
        ]))
    else:
        story.append(Paragraph("Site analysis not run.", BODY))

    # 6. Assumptions
    story.append(Paragraph("6. Input Assumptions", H2))
    story.extend(_bullets(design.get("assumptions", ["No assumptions recorded."])))

    # 7 & 8. Design concept + dimensions
    story.append(Paragraph("7. Proposed Design Concept", H2))
    story.extend(_bullets([f"{l['name']}: {l['description']}" for l in design.get("layers", [])]) or
                 [Paragraph("n/a", BODY)])
    story.append(Paragraph("8. Dimensions", H2))
    story.append(_kv_table([(k, v) for k, v in design.get("geometry", {}).items()]))

    # 9. BOQ
    story.append(Paragraph("9. Quantity Estimate / BOQ", H2))
    line_items = (estimate.line_items_json or []) if estimate else []
    if line_items:
        rows = [["Item", "Qty", "Unit", "Rate", "Amount"]]
        for li in line_items:
            rows.append([li["item_name"], f"{li['quantity']:,}", li["unit"],
                         f"{li['rate']:,}", f"{li['amount']:,.0f}"])
        table = Table(rows, colWidths=[7 * cm, 2.5 * cm, 1.5 * cm, 2.5 * cm, 3 * cm])
        table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
        ]))
        story.append(table)

    # 10. Cost estimate
    story.append(Paragraph("10. Cost Estimate", H2))
    cost = calc.get("cost_summary", {})
    if cost:
        story.append(_kv_table([
            ("Low", f"{cost.get('total_low', 0):,.0f} {cost.get('currency', '')}"),
            ("Medium", f"{cost.get('total_medium', 0):,.0f} {cost.get('currency', '')}"),
            ("High", f"{cost.get('total_high', 0):,.0f} {cost.get('currency', '')}"),
            ("Contingency", f"{cost.get('contingency_percent', 0)}%"),
        ]))

    # 11. Construction sequence
    story.append(Paragraph("11. Construction Sequence", H2))
    story.extend([Paragraph(f"{i+1}. {step}", BODY)
                  for i, step in enumerate(design.get("construction_sequence", []))])

    # 12. Risks
    story.append(Paragraph("12. Risk Checklist", H2))
    story.extend(_bullets(design.get("risks", [])))

    # 13. Required surveys/approvals
    story.append(Paragraph("13. Required Surveys and Approvals", H2))
    story.extend(_bullets(design.get("required_permissions", [])))

    # 14. Disclaimer
    story.append(Paragraph("14. Engineering Disclaimer", H2))
    story.append(Paragraph(DISCLAIMER, WARN))

    def _footer(canvas, doc_):
        canvas.saveState()
        canvas.setFont("Helvetica", 6)
        canvas.setFillColor(colors.HexColor("#8a1f1f"))
        canvas.drawString(1.5 * cm, 0.8 * cm, "PRELIMINARY PLANNING OUTPUT ONLY - NOT FOR CONSTRUCTION")
        canvas.drawRightString(A4[0] - 1.5 * cm, 0.8 * cm, f"Page {doc_.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    return buf.getvalue()
