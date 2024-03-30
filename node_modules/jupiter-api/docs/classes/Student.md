[jupiter-api](../README.md) / Student

# Class: Student

Template for a student.

**`Remarks`**

A student object is returned when the `Scraper` object finishes retrieving data from Jupiter.

## Table of contents

### Properties

- [name](Student.md#name)
- [gpa](Student.md#gpa)
- [courses](Student.md#courses)

### Constructors

- [constructor](Student.md#constructor)

### Methods

- [toString](Student.md#tostring)

## Properties

### name

• `Readonly` **name**: `string`

#### Defined in

[models/student.ts:10](https://github.com/Wolfiej-k/jupiter-api/blob/e681e95/lib/models/student.ts#L10)

___

### gpa

• `Readonly` **gpa**: `number`

#### Defined in

[models/student.ts:11](https://github.com/Wolfiej-k/jupiter-api/blob/e681e95/lib/models/student.ts#L11)

___

### courses

• `Readonly` **courses**: [`Course`](Course.md)[]

#### Defined in

[models/student.ts:12](https://github.com/Wolfiej-k/jupiter-api/blob/e681e95/lib/models/student.ts#L12)

## Constructors

### constructor

• **new Student**(`name`, `courses`)

Constructs a `Student` object and calculates GPA.

**`Remarks`**

All courses with exact name "Phys Ed" are excluded from GPA calculations.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | Name of student |
| `courses` | [`Course`](Course.md)[] | All student courses |

#### Defined in

[models/student.ts:23](https://github.com/Wolfiej-k/jupiter-api/blob/e681e95/lib/models/student.ts#L23)

## Methods

### toString

▸ **toString**(): `string`

JSON representation of the `Student` instance.

#### Returns

`string`

String-ified fields and subfields

#### Defined in

[models/student.ts:43](https://github.com/Wolfiej-k/jupiter-api/blob/e681e95/lib/models/student.ts#L43)
