# Large file test
import sys
print("Performance test file")

# Sample data
data = list(range(10000))
for i in data:
    if i % 1000 == 0:
        print(f"Processing {i}")

print("Test complete")