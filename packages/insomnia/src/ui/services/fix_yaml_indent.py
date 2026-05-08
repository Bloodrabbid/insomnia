import re

file_path = '/Users/udinkirill/PycharmProjects/insomnia-collections/insomnia-sync.yaml'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

fixed_lines = []
in_text_block = False
text_block_indent = 0

for line in lines:
    stripped = line.lstrip()
    indent = len(line) - len(stripped)

    # Начало блока текста
    if 'text: |-' in line:
        in_text_block = True
        text_block_indent = indent + 2 # Ожидаемый отступ контента
        fixed_lines.append(line)
        continue
    
    # Проверка на выход из блока (любой ключ YAML на том же уровне или выше, чем text:)
    if in_text_block and stripped and not stripped.startswith('#') and indent < text_block_indent:
        # Проверяем, не является ли это просто кривым отступом внутри блока
        if any(key in stripped for key in ['headers:', 'method:', 'meta:', 'authentication:', 'settings:']):
            in_text_block = False
        else:
            # Если это не похоже на ключ YAML, значит это просто кривой отступ — исправляем его
            line = ' ' * text_block_indent + stripped
            fixed_lines.append(line)
            continue

    if in_text_block:
        # Если строка пустая или имеет неправильный отступ — правим
        if not stripped:
            fixed_lines.append('\n')
        elif indent < text_block_indent:
            fixed_lines.append(' ' * text_block_indent + stripped)
        else:
            fixed_lines.append(line)
    else:
        fixed_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(fixed_lines)

print("Отступы в блоках текста синхронизированы.")
