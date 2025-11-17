"""
Convert flat XML structure (Mapping_Ventiltester_V4.xml) to structured format
based on the pattern used in Mapping_Ventiltester_ns1.xml
"""

import xml.etree.ElementTree as ET
import re
from collections import defaultdict

def parse_label(label):
    """Parse label to extract block, database, and field information"""
    parts = label.split('.')
    if len(parts) < 2:
        return None, None, None, label
    
    block = parts[0] if parts[0].startswith('Block') else None
    db = parts[1] if len(parts) > 1 else None
    remaining = '.'.join(parts[2:]) if len(parts) > 2 else ''
    
    return block, db, remaining, label

def get_section_key(db_name, label=''):
    """Determine the top-level section for a database"""
    if 'AllgemeineParameter' in db_name:
        return 'DB_AllgemeineParameter_1-4'
    elif 'VentilKonfiguration' in db_name:
        return 'DB_Ventilkonfiguration_1-4'
    elif 'LangzeittestKonfiguration' in db_name:
        return 'DB_Konfiguration_Langzeittest_1-4'
    elif 'DetailtestKonfiguration' in db_name:
        return 'DB_Konfiguration_Detailtest_1-4'
    elif 'EinzeltestKonfiguration' in db_name:
        return 'DB_Konfiguration_Einzeltest_1-4'
    elif 'Kommandos' in db_name:
        return 'DB_Kommandos_1-4'
    elif 'Daten_Langzeittest' in db_name:
        return 'DB_Daten_Langzeittest_1-4'
    # For DB_Daten_Detailtest, check the label to determine measurement type
    elif 'DB_Daten_Detailtest' in db_name or 'Daten_Detailtest' in db_name:
        if 'DB_Strommessung1' in label or 'Strommessung' in label:
            return 'DB_Daten_Strommessung_1-4'
        elif 'DB_Durchflussmessung1' in label or 'Durchflussmessung' in label:
            return 'DB_Daten_Durchflussmessung_1-4'
        elif 'DB_Kraftmessung1' in label or 'Kraftmessung' in label:
            return 'DB_Daten_Kraftmessung_1-4'
    return None

def get_subsection(label, db_name):
    """Determine if mapping needs subsection (like Ventil1-16 for current measurements)"""
    # For current measurement data (Strommessung), group by valve number
    if 'DB_Strommessung1.DB_Ventil' in label:
        match = re.search(r'DB_Ventil_Ext(\d+)', label)
        if match:
            ventil_num = match.group(1)
            return f'Ventil{ventil_num}'
    
    # For flow measurements (Durchflussmessung), group by valve
    if 'DB_Durchflussmessung1.DB_Ventil' in label:
        match = re.search(r'DB_Ventil(\d+)', label)
        if match:
            ventil_num = match.group(1)
            return f'Ventil{ventil_num}'
    
    # For force measurements (Kraftmessung), group by valve
    if 'DB_Kraftmessung1.DB_Ventil' in label:
        match = re.search(r'DB_Ventil(\d+)', label)
        if match:
            ventil_num = match.group(1)
            return f'Ventil{ventil_num}'
    
    return None

def convert_to_structured(input_file, output_file):
    """Convert flat XML to structured XML"""
    # Parse input
    tree = ET.parse(input_file)
    root = tree.getroot()
    
    # Create output structure
    output_root = ET.Element('DataMapping')
    
    # Copy namespace URIs
    ns_uris = root.find('NamespaceUris')
    if ns_uris is not None:
        output_root.append(ns_uris)
    
    # Create Mappings container
    mappings_elem = ET.SubElement(output_root, 'Mappings')
    
    # Organize mappings by structure
    sections = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    global_mappings = []
    current_comment = None
    
    mappings = root.find('Mappings')
    if mappings is not None:
        for item in mappings:
            if item.tag == ET.Comment:
                current_comment = item.text.strip() if item.text else ''
            elif item.tag == 'Mapping':
                label = item.get('Label', '')
                
                # Handle global data separately
                if label.startswith('DB_GlobalData'):
                    global_mappings.append((item, current_comment))
                else:
                    block, db, remaining, full_label = parse_label(label)
                    section = get_section_key(db, label) if db else None
                    
                    if section and block:
                        subsection = get_subsection(label, db)
                        if subsection:
                            sections[section][block][subsection].append((item, current_comment))
                        else:
                            sections[section][block][None].append((item, current_comment))
    
    # Write global data first
    if global_mappings:
        comment = ET.Comment('\n' + '=' * 168 + '\n')
        mappings_elem.append(comment)
        comment = ET.Comment(' Globale Daten  ')
        mappings_elem.append(comment)
        comment = ET.Comment('\n' + '=' * 168 + '\n')
        mappings_elem.append(comment)
        
        for mapping, _ in global_mappings:
            new_mapping = ET.SubElement(mappings_elem, 'Mapping')
            for key, value in mapping.attrib.items():
                new_mapping.set(key, value)
    
    # Write structured sections
    section_order = [
        'DB_AllgemeineParameter_1-4',
        'DB_Ventilkonfiguration_1-4',
        'DB_Konfiguration_Langzeittest_1-4',
        'DB_Konfiguration_Detailtest_1-4',
        'DB_Konfiguration_Einzeltest_1-4',
        'DB_Kommandos_1-4',
        'DB_Daten_Langzeittest_1-4',
        'DB_Daten_Strommessung_1-4',
        'DB_Daten_Durchflussmessung_1-4',
        'DB_Daten_Kraftmessung_1-4'
    ]
    
    for section_name in section_order:
        if section_name not in sections:
            continue
        
        # Add section comment
        comment = ET.Comment('\n' + '=' * 168 + '\n')
        mappings_elem.append(comment)
        section_title = section_name.replace('_', ' ').replace('1-4', '1-4 ')
        comment = ET.Comment(f' {section_title}')
        mappings_elem.append(comment)
        comment = ET.Comment('\n' + '=' * 168 + '\n')
        mappings_elem.append(comment)
        
        # Create section element
        section_elem = ET.SubElement(mappings_elem, section_name)
        
        # Add blocks in order
        for block_name in ['Block1', 'Block2', 'Block3', 'Block4']:
            if block_name not in sections[section_name]:
                continue
            
            # Add block comment
            comment = ET.Comment('\n' + '=' * 168 + '\n')
            section_elem.append(comment)
            comment = ET.Comment(f' {block_name} ')
            section_elem.append(comment)
            comment = ET.Comment('\n' + '=' * 168 + '\n')
            section_elem.append(comment)
            
            # Create block element
            block_elem = ET.SubElement(section_elem, block_name)
            
            # Check if this section has subsections (like Ventil1-16)
            subsections = sections[section_name][block_name]
            
            # If there are subsections, create them
            has_subsections = any(k is not None for k in subsections.keys())
            
            if has_subsections:
                # Add mappings without subsection first (if any)
                for mapping, comment_text in subsections.get(None, []):
                    if comment_text and comment_text != '':
                        comment = ET.Comment(f' {comment_text} ')
                        block_elem.append(comment)
                    new_mapping = ET.SubElement(block_elem, 'Mapping')
                    for key, value in mapping.attrib.items():
                        new_mapping.set(key, value)
                
                # Add subsections (Ventil1-16)
                for i in range(1, 17):
                    subsection_name = f'Ventil{i}'
                    if subsection_name in subsections:
                        subsection_elem = ET.SubElement(block_elem, subsection_name)
                        
                        # Add comment for ventil
                        comment = ET.Comment(f' Ventil {i} ')
                        subsection_elem.append(comment)
                        
                        for mapping, comment_text in subsections[subsection_name]:
                            new_mapping = ET.SubElement(subsection_elem, 'Mapping')
                            for key, value in mapping.attrib.items():
                                new_mapping.set(key, value)
            else:
                # No subsections, just add all mappings
                for mapping, comment_text in subsections.get(None, []):
                    if comment_text and comment_text != '' and '===' not in comment_text and 'Block' not in comment_text:
                        comment = ET.Comment(f' {comment_text} ')
                        block_elem.append(comment)
                    new_mapping = ET.SubElement(block_elem, 'Mapping')
                    for key, value in mapping.attrib.items():
                        new_mapping.set(key, value)
    
    # Write output with proper formatting
    indent(output_root)
    output_tree = ET.ElementTree(output_root)
    ET.register_namespace('', '')  # Avoid ns0 prefix
    output_tree.write(output_file, encoding='utf-8', xml_declaration=True)
    
    print(f"Conversion complete! Output written to {output_file}")

def indent(elem, level=0):
    """Add proper indentation to XML elements"""
    indent_str = "\t"
    i = "\n" + level * indent_str
    if len(elem):
        if not elem.text or not elem.text.strip():
            elem.text = i + indent_str
        if not elem.tail or not elem.tail.strip():
            elem.tail = i
        for child in elem:
            indent(child, level + 1)
        if not child.tail or not child.tail.strip():
            child.tail = i
    else:
        if level and (not elem.tail or not elem.tail.strip()):
            elem.tail = i

if __name__ == '__main__':
    input_file = 'Mapping_Ventiltester_V4.xml'
    output_file = 'Mapping_Ventiltester_V4_NS1.xml'
    convert_to_structured(input_file, output_file)
