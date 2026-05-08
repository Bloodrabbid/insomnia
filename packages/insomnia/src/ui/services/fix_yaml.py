import re

file_path = '/Users/udinkirill/PycharmProjects/insomnia-collections/insomnia-sync.yaml'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Исправляем паттерн { { var } } на "{{ var }}"
# 1. Убираем пробелы между скобками { { -> {{ и } } -> }}
# 2. Оборачиваем в кавычки те url, которые начинаются с {{ и не в кавычках
fixed_content = re.sub(r'\{\s+\{', '{{', content)
fixed_content = re.sub(r'\}\s+\}', '}}', fixed_content)

# Оборачиваем url: {{ ... }} в кавычки, если они еще не в них
fixed_content = re.sub(r'url:\s+({{.*?}}.*?)\n', r'url: "\1"\n', fixed_content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(fixed_content)

print("Файл успешно исправлен: убраны пробелы в скобках и добавлены кавычки для URL.")
