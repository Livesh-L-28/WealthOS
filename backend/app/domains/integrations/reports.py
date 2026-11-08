"""WealthOS Financial Report Generator Service.

Generates CSV, Excel (openpyxl), and PDF (reportlab) financial reports
with strict formula injection sanitization and Decimal precision.
"""

import csv
import io
import re
from decimal import Decimal
from typing import Any

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

# Characters that trigger formula execution in Excel/Calc/Spreadsheet applications (CWE-1236)
FORMULA_PREFIX_REGEX = re.compile(r"^[\=\+\-\@\t\r]")


def sanitize_formula_injection(value: Any) -> Any:
    """Prepend single quote to string values starting with formula execution tokens."""
    if isinstance(value, str) and FORMULA_PREFIX_REGEX.match(value):
        return f"'{value}"
    return value


class FinancialReportGenerator:
    """Enterprise report export engine for WealthOS."""

    @staticmethod
    def generate_csv(headers: list[str], rows: list[list[Any]]) -> bytes:
        """Generate formula-safe CSV bytes."""
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

        # Sanitize headers and rows
        safe_headers = [sanitize_formula_injection(h) for h in headers]
        writer.writerow(safe_headers)

        for row in rows:
            safe_row = [sanitize_formula_injection(cell) for cell in row]
            writer.writerow(safe_row)

        return output.getvalue().encode("utf-8")

    @staticmethod
    def generate_excel(sheet_title: str, headers: list[str], rows: list[list[Any]]) -> bytes:
        """Generate professionally styled Excel workbook bytes with formula safety."""
        wb = Workbook()
        ws = wb.active
        ws.title = sheet_title[:31]

        # Header formatting
        header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        border_thin = Side(border_style="thin", color="CBD5E1")
        cell_border = Border(
            top=border_thin, left=border_thin, right=border_thin, bottom=border_thin
        )

        safe_headers = [sanitize_formula_injection(h) for h in headers]
        ws.append(safe_headers)

        for cell in ws[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = cell_border

        # Rows
        row_font = Font(name="Calibri", size=10, color="0F172A")
        for row in rows:
            safe_row = [sanitize_formula_injection(cell) for cell in row]
            ws.append(safe_row)

        # Style data cells & auto-adjust column width
        for row in ws.iter_rows(min_row=2, max_row=ws.max_row, min_col=1, max_col=ws.max_column):
            for cell in row:
                cell.font = row_font
                cell.border = cell_border
                if isinstance(cell.value, (int, float, Decimal)):
                    cell.alignment = Alignment(horizontal="right")
                    cell.number_format = "#,##0.00"

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = col[0].column_letter
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

        output = io.BytesIO()
        wb.save(output)
        return output.getvalue()

    @staticmethod
    def generate_pdf(
        report_title: str,
        headers: list[str],
        rows: list[list[Any]],
        metadata: dict[str, str] | None = None,
    ) -> bytes:
        """Generate styled financial report PDF bytes."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Heading1"],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0B0F17"),
            spaceAfter=8,
        )
        meta_style = ParagraphStyle(
            "ReportMeta",
            parent=styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#64748B"),
            spaceAfter=14,
        )

        elements = []
        elements.append(Paragraph(report_title, title_style))

        if metadata:
            meta_text = " &bull; ".join(f"<b>{k}:</b> {v}" for k, v in metadata.items())
            elements.append(Paragraph(meta_text, meta_style))
        elements.append(Spacer(1, 10))

        # Table data
        table_data = [headers]
        for row in rows:
            formatted_row = []
            for cell in row:
                if isinstance(cell, (int, float, Decimal)):
                    formatted_row.append(f"₹{Decimal(str(cell)):,.2f}")
                else:
                    formatted_row.append(str(cell))
            table_data.append(formatted_row)

        table = Table(table_data, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                    ("TOPPADDING", (0, 0), (-1, 0), 6),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F8FAFC")),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 1), (-1, -1), 8),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        elements.append(table)
        doc.build(elements)
        return buffer.getvalue()
