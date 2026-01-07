def PLUS(numbers):
    x = list(numbers)
    for i in range(len(x)):
        print(x[i])
        print(type(x))

nums = input().split()
nums = []
print(PLUS(nums))