import re

file_path = '/Users/udinkirill/PycharmProjects/insomnia-collections/insomnia-sync.yaml'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Исправляем двойные скобки перед ключевыми полями YAML
content = re.sub(r'(\s+)\}\s*\}\n(\s+)(headers|method|meta|authentication|settings):', r'\1}\n\2\3:', content)

# 2. Исправляем }} на отдельной строке
def fix_braces(match):
    indent = match.group(1)
    return indent + "} }"

content = re.sub(r'^(\s+)(\}\s*\})$', fix_braces, content, flags=re.MULTILINE)

# 3. Гарантируем кавычки для URL с переменными
content = re.sub(r'url:\s+({{.*?}}.*?)\n', r'url: "\1"\n', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Глобальное исправление завершено успешно.")
