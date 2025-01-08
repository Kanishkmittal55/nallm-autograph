import re

def extract_sections_from_patent(file_path):
    pattern_sections = r'(?m)^([A-Z0-9][A-Z0-9\\s,\'\\u2019/()\\-]*)$'

    # Read the patent document
    with open(file_path, 'r') as file:
        text = file.read()

    # Split text by major headings
    sections = re.split(pattern_sections, text)

    # Create a new structured text with proper divisions
    structured_text = ""
    for i in range(1, len(sections), 2):
        section_heading = sections[i].strip()
        section_body = sections[i+1].strip()
        structured_text += f"SECTION: {section_heading}\n"
        structured_text += f"{section_body}\n\n"

    # Save the structured text to a new file
    output_file_path = file_path.replace('.txt', '_structured.txt')
    with open(output_file_path, 'w') as output_file:
        output_file.write(structured_text)

    return output_file_path

# Example usage:
# Provide the path to your patent document as a .txt file
file_path = "patent-1.txt"
output_file = extract_sections_from_patent(file_path)
print(f"Structured sections saved to {output_file}")
