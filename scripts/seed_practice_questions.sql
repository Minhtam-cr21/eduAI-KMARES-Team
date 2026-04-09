-- Seed: 3 câu hỏi mỗi ngôn ngữ (easy).

INSERT INTO public.practice_questions (title, description, language, difficulty, initial_code, sample_input, sample_output, hint)
VALUES
-- Python
('Tính tổng hai số', E'Nhập 2 số nguyên a, b từ stdin (mỗi dòng 1 số). In ra tổng.', 'python', 'easy',
 E'a = int(input())\nb = int(input())\n# In ra tổng a + b', E'3\n5', '8', 'Dùng int(input()) để đọc số.'),

('Đếm nguyên âm', E'Nhập một chuỗi. In ra số nguyên âm (a, e, i, o, u, không phân biệt hoa thường).', 'python', 'easy',
 E's = input()\n# Đếm nguyên âm trong s', 'Hello World', '3', 'Dùng vòng lặp kiểm tra từng ký tự.'),

('Kiểm tra số chẵn lẻ', E'Nhập một số nguyên. In "even" nếu chẵn, "odd" nếu lẻ.', 'python', 'easy',
 E'n = int(input())\n# In "even" hoặc "odd"', '4', 'even', 'Dùng toán tử % (modulo).'),

-- JavaScript
('Hello Name', E'Đọc tên từ stdin (readline). In ra "Hello, <tên>!".', 'javascript', 'easy',
 E'const readline = require("readline");\nconst rl = readline.createInterface({ input: process.stdin });\nrl.on("line", (name) => {\n  // In ra lời chào\n  rl.close();\n});', 'An', 'Hello, An!', 'Template literal: `Hello, ${name}!`'),

('Đảo chuỗi', E'Nhập chuỗi từ stdin. In ra chuỗi đảo ngược.', 'javascript', 'easy',
 E'process.stdin.on("data", (d) => {\n  const s = d.toString().trim();\n  // In chuỗi đảo ngược\n});', 'abc', 'cba', 'Dùng split, reverse, join.'),

('Tính giai thừa', E'Nhập số nguyên n (0 ≤ n ≤ 20) từ stdin. In n!.', 'javascript', 'easy',
 E'process.stdin.on("data", (d) => {\n  const n = parseInt(d.toString().trim());\n  // Tính n!\n});', '5', '120', 'Dùng vòng lặp hoặc đệ quy.'),

-- C++
('In tam giác sao', E'Nhập n. In tam giác vuông n dòng bằng ký tự *.', 'cpp', 'easy',
 E'#include <iostream>\nusing namespace std;\nint main() {\n  int n;\n  cin >> n;\n  // In tam giác\n  return 0;\n}', '3', E'*\n**\n***', 'Hai vòng lặp lồng nhau.'),

('Tổng mảng', E'Dòng 1: n. Dòng 2: n số nguyên cách nhau bởi dấu cách. In tổng.', 'cpp', 'easy',
 E'#include <iostream>\nusing namespace std;\nint main() {\n  int n; cin >> n;\n  // Đọc n số và in tổng\n  return 0;\n}', E'4\n1 2 3 4', '10', 'Dùng vòng lặp đọc từng số.'),

('Đếm chữ số', E'Nhập số nguyên dương. In ra số lượng chữ số.', 'cpp', 'easy',
 E'#include <iostream>\nusing namespace std;\nint main() {\n  int n; cin >> n;\n  // Đếm chữ số\n  return 0;\n}', '12345', '5', 'Chia liên tục cho 10 đến khi bằng 0.'),

-- Java
('Cộng hai số', E'Nhập 2 số nguyên, in tổng.', 'java', 'easy',
 E'import java.util.Scanner;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    // Đọc 2 số và in tổng\n  }\n}', E'3 7', '10', 'sc.nextInt()'),

('Kiểm tra palindrome', E'Nhập chuỗi, in "yes" nếu palindrome, "no" nếu không.', 'java', 'easy',
 E'import java.util.Scanner;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    String s = sc.nextLine();\n    // Kiểm tra palindrome\n  }\n}', 'madam', 'yes', 'So sánh chuỗi với chuỗi đảo ngược.'),

('FizzBuzz', E'Nhập n. In các số từ 1 đến n; chia hết 3 in Fizz, 5 in Buzz, cả 3 và 5 in FizzBuzz.', 'java', 'easy',
 E'import java.util.Scanner;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n = sc.nextInt();\n    // FizzBuzz\n  }\n}', '5', E'1\n2\nFizz\n4\nBuzz', 'Kiểm tra chia hết 15 trước.')

ON CONFLICT DO NOTHING;
