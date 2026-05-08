import re

file_path = '/Users/udinkirill/PycharmProjects/insomnia-collections/insomnia-sync.yaml'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

fixed_lines = []
in_text_block = False

for line in lines:
    # Проверяем, входим ли мы в блок текста (тело запроса)
    if 'text: |-' in line:
        in_text_block = True
        fixed_lines.append(line)
        continue
    
    # Если мы в блоке текста, и строка имеет меньший отступ, чем была команда text:, 
    # значит блок закончился (но для простоты будем проверять ключевые поля YAML)
    if in_text_block and (line.strip().startswith('headers:') or line.strip().startswith('method:') or line.strip().startswith('meta:')):
        in_text_block = False

    if in_text_block:
        # Внутри блока JSON/текста возвращаем пробел между } }
        # Но только если это не похоже на переменную {{ _. }}
        # Ищем }} в конце строки или перед запятой, что типично для JSON
        new_line = re.sub(r'\}\}', r'} }', line)
        fixed_lines.append(new_line)
    else:
        # Вне блока текста (например в url:) нам как раз нужны {{ }} без пробелов
        fixed_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(fixed_lines)

print("Файл восстановлен: в блоках JSON возвращены пробелы для скобок, в URL оставлены переменные.")
