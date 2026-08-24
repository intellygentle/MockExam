#!/usr/bin/env python3
"""Generate a PDF from the passage text."""
import os, sys

# First, check if we can use reportlab
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib.enums import TA_LEFT, TA_CENTER
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib.colors import HexColor
except ImportError:
    print("Installing reportlab...")
    os.system(f"{sys.executable} -m pip install reportlab -q")
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib.enums import TA_LEFT, TA_CENTER
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib.colors import HexColor

PASSAGE_TITLE = "The Disappearance"
PASSAGE_TEXT = """Sandra lingered at the airport, watching the steady stream of passengers beyond the glass doors. She expected Lucy to turn back once more, to wave or smile, but she didn't. She walked forward with quiet confidence, already focused on the life waiting for her abroad.

At first, Sandra dismissed her unease as habit. She had always been cautious, the one who imagined problems before they happened. Still, she kept her phone close, checking it often. Lucy had promised to send a message when she landed. It was a small thing, but it mattered.

By the second day, the silence felt wrong. Lucy was not careless. She would have sent something, even a single word.

By the third day, the silence became unbearable. Sandra called repeatedly, each time hearing the same cheerful voicemail. When she contacted the exchange organisation, she expected reassurance. Instead, there was hesitation.

"The address we have doesn't appear to exist," the woman admitted.

Sandra felt a sharp, cold fear.

Two days later, she was on a plane.

The city Lucy had travelled to felt unfamiliar. Sandra moved through it with a single purpose, following the address Lucy had sent her. The street existed, but the house did not. At the end of the road, there was only an empty gap between buildings.

A passer-by told her a house had once stood there, but it had burnt down years ago.

At the police station, Sandra explained everything. The officer listened, but his response was distant.

"Your daughter entered the country," he said. "After that, we have no confirmed information."

"She didn't disappear on her own," Sandra replied.

"We will investigate," he said, without conviction.

That night, Sandra read through Lucy's messages again. Most were normal—plans, excitement, and questions. But one name appeared more than once.

Daniel.

Lucy had mentioned him as a coordinator, someone who helped organise the exchange. Sandra searched for him but found nothing—no official connection and no clear identity.

The next day, she returned to the airport and spoke to anyone who might remember Lucy. Most did not. One taxi driver paused when he saw her photo.

"She was with a man," he said. "Not family. He was watching everything."

That was enough.

Sandra told the police, but nothing changed. They noted it and told her to wait.

She didn't.

Days later, the police contacted her. A neighbour had reported noises in an abandoned building outside the city.

Sandra insisted on going.

The building was empty and damp, with long corridors that echoed every step. They searched several rooms before stopping at a closed door.

Inside, there was almost nothing.

Only a suitcase.

Sandra recognised it immediately. It was Lucy's.

There were no signs of struggle—just the suitcase, placed carefully in the centre of the room.

Sandra took it back to her hotel.

That night, she sat beside it before opening it. When her phone vibrated, the sound felt too loud in the silence.

A message from Lucy appeared: I'm safe. Please stop looking.

Sandra stared at it. The words felt wrong—too controlled.

She replied: Where are you? I'm coming.

The answer came at once: Don't.

She tried calling, but the line did not connect. Another message followed: He said you wouldn't stop.

A cold feeling spread through her chest.

Lucy, what's going on?

There was a pause. Then: You weren't supposed to come.

A final message appeared: Now he knows you're here too.

Sandra lowered the phone and opened the suitcase.

Inside, everything was neatly packed. Clothes, shoes — exactly as Lucy had prepared them. Nothing had been used.

Sandra frowned. That didn't make sense.

She searched more carefully and found a small envelope hidden beneath the lining. Her name was written on it.

Mum.

Her hands shook as she opened it.

Inside was a short note.

I'm sorry I didn't tell you. You wouldn't have let me go.

Sandra read on.

I met him months ago. He said he could help me start over somewhere new. No rules, no limits. I know you won't understand, but I need this. Please don't try to find me.

Sandra lowered the note slowly.

Lucy had planned everything.

The fake address. The silence. The disappearance.

Sandra picked up her phone again and reread the last message.

Now he knows you're here too.

This time, it was clear.

Lucy wasn't asking for help.

She was warning her.

A faint sound came from the corridor outside.

Sandra froze.

Slow footsteps.

Stopping just outside her door.

For a second, she didn't move.

Then she stepped forward and opened it.

The corridor was empty.

But on the floor, directly in front of her door, lay a second envelope.

Sandra bent down slowly and picked it up.

Her name was written on it again. This time, the handwriting was not Lucy's."""

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "passages")
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "the-disappearance.pdf")

# Build PDF
doc = SimpleDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=0.8 * inch,
    rightMargin=0.8 * inch,
    topMargin=0.7 * inch,
    bottomMargin=0.7 * inch,
    title=PASSAGE_TITLE,
)

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "PassageTitle",
    parent=styles["Title"],
    fontSize=22,
    leading=28,
    textColor=HexColor("#1a1a2e"),
    spaceAfter=6,
    alignment=TA_CENTER,
    fontName="Helvetica-Bold",
)

subtitle_style = ParagraphStyle(
    "PassageSubtitle",
    parent=styles["Normal"],
    fontSize=11,
    leading=15,
    textColor=HexColor("#555555"),
    spaceAfter=20,
    alignment=TA_CENTER,
    fontName="Helvetica-Oblique",
)

body_style = ParagraphStyle(
    "PassageBody",
    parent=styles["Normal"],
    fontSize=12,
    leading=19,
    textColor=HexColor("#222222"),
    spaceAfter=14,
    firstLineIndent=0,
    fontName="Helvetica",
)

divider = HRFlowable(
    width="40%",
    thickness=1,
    color=HexColor("#cccccc"),
    spaceAfter=16,
    spaceBefore=4,
)

story = []

# Title page
story.append(Spacer(1, 0.4 * inch))
story.append(Paragraph(PASSAGE_TITLE, title_style))
story.append(Paragraph("A Short Story", subtitle_style))
story.append(divider)

# Split text into paragraphs and render each
paragraphs = [p.strip() for p in PASSAGE_TEXT.split("\n\n") if p.strip()]

for para in paragraphs:
    # Convert newlines within dialogue paragraphs to <br/>
    text = para.replace("\n", "<br/>")
    # Escape ampersands for XML
    text = text.replace("&", "&amp;")
    # Convert double quotes within text to XML entities for reportlab
    story.append(Paragraph(text, body_style))

# Build
doc.build(story)
print(f"PDF generated: {OUTPUT_PATH}")
print(f"Size: {os.path.getsize(OUTPUT_PATH)} bytes")