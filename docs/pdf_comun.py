"""Estilo común de los PDF del proyecto (manual de uso e informe de ingeniería)."""
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
                                PageBreak, KeepTogether, Image)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

F = "C:/Windows/Fonts/"
pdfmetrics.registerFont(TTFont("A", F + "arial.ttf"))
pdfmetrics.registerFont(TTFont("AB", F + "arialbd.ttf"))
pdfmetrics.registerFont(TTFont("AI", F + "ariali.ttf"))
pdfmetrics.registerFont(TTFont("ABI", F + "arialbi.ttf"))
pdfmetrics.registerFont(TTFont("M", F + "consola.ttf"))
registerFontFamily("A", normal="A", bold="AB", italic="AI", boldItalic="ABI")

INK = colors.HexColor("#1b1d22")
RED = colors.HexColor("#c8102e")
GREY = colors.HexColor("#5b6270")
LIGHT = colors.HexColor("#f3f4f6")
LINE = colors.HexColor("#d9dce1")
SOFT = colors.HexColor("#fdf1f3")

sTitle = ParagraphStyle("t", fontName="AB", fontSize=30, leading=36, textColor=colors.white)
sSub = ParagraphStyle("s", fontName="A", fontSize=13, leading=18, textColor=colors.HexColor("#c9ccd3"))
sH1 = ParagraphStyle("h1", fontName="AB", fontSize=17, leading=22, textColor=INK, spaceBefore=6, spaceAfter=8, keepWithNext=1)
sH2 = ParagraphStyle("h2", fontName="AB", fontSize=12.5, leading=16, textColor=RED, spaceBefore=10, spaceAfter=4, keepWithNext=1)
sH3 = ParagraphStyle("h3", fontName="AB", fontSize=10.5, leading=14, textColor=INK, spaceBefore=6, spaceAfter=2, keepWithNext=1)
sP = ParagraphStyle("p", fontName="A", fontSize=9.5, leading=13.5, textColor=INK, spaceAfter=4)
sB = ParagraphStyle("b", parent=sP, leftIndent=12, bulletIndent=2, spaceAfter=2)
sN = ParagraphStyle("nb", parent=sP, leftIndent=16, bulletIndent=2, spaceAfter=2)
sCell = ParagraphStyle("c", fontName="A", fontSize=8.3, leading=10.8, textColor=INK)
sCellH = ParagraphStyle("ch", fontName="AB", fontSize=8.3, leading=10.8, textColor=colors.white)
sNote = ParagraphStyle("n", parent=sP, fontName="AI", textColor=GREY, fontSize=8.8)
sMono = ParagraphStyle("m", fontName="M", fontSize=7.8, leading=9.6, textColor=INK)
sToc = ParagraphStyle("toc", parent=sP, leftIndent=8, spaceAfter=1)

W = letter[0] - 3.6 * cm


class Documento:
    def __init__(self, salida, titulo, pie):
        self.salida, self.titulo, self.pie, self.story = salida, titulo, pie, []

    # Bloques
    def h1(self, t): self.story.append(Paragraph(t, sH1))
    def h2(self, t): self.story.append(Paragraph(t, sH2))
    def h3(self, t): self.story.append(Paragraph(t, sH3))
    def p(self, t): self.story.append(Paragraph(t, sP))
    def nota(self, t): self.story.append(Paragraph(t, sNote))
    def sp(self, h=6): self.story.append(Spacer(1, h))
    def salto(self): self.story.append(PageBreak())

    def lista(self, items):
        for i in items:
            self.story.append(Paragraph(i, sB, bulletText="•"))

    def pasos(self, items):
        for n, i in enumerate(items, 1):
            self.story.append(Paragraph(i, sN, bulletText=f"{n}."))

    def tabla(self, filas, anchos, encabezado=True):
        tot = sum(anchos)
        ws = [W * a / tot for a in anchos]
        datos = [[Paragraph(str(c), sCellH if (encabezado and i == 0) else sCell) for c in f] for i, f in enumerate(filas)]
        t = Table(datos, colWidths=ws, repeatRows=1 if encabezado else 0)
        estilo = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                  ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                  ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4)]
        if encabezado:
            estilo.append(("BACKGROUND", (0, 0), (-1, 0), INK))
        for i in range(1 if encabezado else 0, len(filas)):
            if i % 2 == 0:
                estilo.append(("BACKGROUND", (0, i), (-1, i), LIGHT))
        t.setStyle(TableStyle(estilo))
        self.story.append(t)
        self.sp(6)

    def recuadro(self, titulo, texto):
        t = Table([[Paragraph(f"<b>{titulo}</b><br/>{texto}", sP)]], colWidths=[W])
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), SOFT), ("LINEBEFORE", (0, 0), (0, -1), 3, RED),
                               ("LEFTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 6),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
        self.story.append(KeepTogether(t))
        self.sp(6)

    def codigo(self, texto):
        t = Table([[Paragraph(texto.replace("&", "&amp;").replace("<", "&lt;").replace(" ", "&nbsp;").replace("\n", "<br/>"), sMono)]], colWidths=[W])
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), LIGHT), ("BOX", (0, 0), (-1, -1), 0.4, LINE),
                               ("LEFTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 6),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
        self.story.append(t)
        self.sp(6)

    def portada(self, titulo, subtitulo, linea, indice, nota, logo=None):
        self.story.append(Spacer(1, 1.6 * cm))
        fila = [Paragraph(titulo, sTitle)]
        if logo and os.path.exists(logo):
            img = Image(logo, width=3.2 * cm, height=3.2 * cm)
            t = Table([[img, Paragraph(titulo, sTitle)]], colWidths=[3.8 * cm, W - 3.8 * cm])
            t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
            self.story.append(t)
        else:
            self.story.extend(fila)
        self.sp(8)
        self.story.append(Paragraph(subtitulo, sSub))
        self.story.append(Paragraph(linea, sSub))
        self.story.append(Spacer(1, 3.6 * cm))
        self.p("<b>Contenido</b>")
        for t in indice:
            self.story.append(Paragraph(t, sToc))
        self.sp(16)
        self.nota(nota)
        self.salto()

    def construir(self):
        pie, titulo = self.pie, self.titulo

        def en_pagina(c, d):
            if d.page == 1:
                c.setFillColor(INK); c.rect(0, letter[1] - 9.5 * cm, letter[0], 9.5 * cm, stroke=0, fill=1)
                c.setFillColor(RED); c.rect(0, letter[1] - 9.8 * cm, letter[0], 0.3 * cm, stroke=0, fill=1)
                return
            c.setStrokeColor(LINE); c.line(1.8 * cm, 1.5 * cm, letter[0] - 1.8 * cm, 1.5 * cm)
            c.setFont("A", 7.5); c.setFillColor(GREY)
            c.drawString(1.8 * cm, 1.05 * cm, pie)
            c.drawRightString(letter[0] - 1.8 * cm, 1.05 * cm, f"Página {d.page}")

        doc = BaseDocTemplate(self.salida, pagesize=letter, leftMargin=1.8 * cm, rightMargin=1.8 * cm,
                              topMargin=1.8 * cm, bottomMargin=2 * cm, title=titulo, author="Diamante Boxing Club")
        marco = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
        doc.addPageTemplates([PageTemplate(id="p", frames=[marco], onPage=en_pagina)])
        doc.build(self.story)
