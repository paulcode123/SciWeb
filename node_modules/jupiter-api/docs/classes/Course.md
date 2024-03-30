[jupiter-api](../README.md) / Course

# Class: Course

Template for a student course.

## Table of contents

### Constructors

- [constructor](Course.md#constructor)

## Constructors

### constructor

• **new Course**(`name`, `teacher`, `schedule`, `grade`, `categories`, `assignments`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | Name of course |
| `teacher` | `string` | Name of course teacher |
| `schedule` | `string` | Course periods, days, and room numbers |
| `grade` | `number` | Current grade in the course |
| `categories` | [`Category`](Category.md)[] | All course categories |
| `assignments` | [`Assignment`](Assignment.md)[] | All course assignments |

#### Defined in

[models/course.ts:23](https://github.com/Wolfiej-k/jupiter-api/blob/e681e95/lib/models/course.ts#L23)
