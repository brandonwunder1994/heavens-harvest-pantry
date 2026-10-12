"""The private Help page and PDF both read lib/founder-guide.json."""
import json, os
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from PIL import Image as PILImage
from xml.sax.saxutils import escape

os.makedirs('private/handoff',exist_ok=True)
guide=json.load(open('lib/founder-guide.json',encoding='utf-8'))
media=json.load(open('lib/founder-guide-images.json',encoding='utf-8'))
body=ParagraphStyle('body',fontName='Helvetica',fontSize=11,leading=15,spaceAfter=8,textColor=colors.HexColor('#302719'))
title=ParagraphStyle('title',parent=body,fontName='Helvetica-Bold',fontSize=23,leading=28,spaceAfter=12)
tip=ParagraphStyle('tip',parent=body,fontSize=10,leading=14,textColor=colors.HexColor('#445033'),backColor=colors.HexColor('#f1f2e9'),borderPadding=9,spaceBefore=10)
story=[]
for section in guide:
 if story:story.append(PageBreak())
 story.append(Paragraph(escape(section['title']),title))
 if media.get(section['id']):
  filename='private/handoff/'+media[section['id']]+'.png'
  if not os.path.exists(filename):raise RuntimeError('Missing sample screen: '+filename)
  with PILImage.open(filename) as im:w,h=im.size
  width=500;height=h*width/w
  if height>265:height=265;width=w*height/h
  story.append(Image(filename,width=width,height=height,hAlign='LEFT'))
  story.append(Paragraph('Sample screen · all people and orders shown are examples.',ParagraphStyle('caption',parent=body,fontSize=8,leading=10,textColor=colors.grey)))
 for n,step in enumerate(section['steps'],1):story.append(Paragraph(f'<b>{n}.</b> '+escape(step),body))
 story.append(Paragraph(escape(section['tip']),tip))
def footer(canvas,doc):
 canvas.saveState();canvas.setFont('Helvetica',8);canvas.setFillColor(colors.HexColor('#625643'))
 canvas.drawString(42,25,"Heaven's Harvest Pantry · Easy owner guide")
 canvas.drawRightString(570,25,str(doc.page));canvas.restoreState()
doc=SimpleDocTemplate('private/handoff/founder-guide.pdf',pagesize=(612,792),rightMargin=42,leftMargin=42,topMargin=36,bottomMargin=42,title="Heaven's Harvest Pantry — Easy owner guide",author="Heaven's Harvest Pantry")
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print('Created private/handoff/founder-guide.pdf')
