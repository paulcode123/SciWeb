[jupiter-api](../README.md) / Scraper

# Class: Scraper

Retrieves student, grade, course, and assignment data from the Jupiter web client.

## Table of contents

### Constructors

- [constructor](Scraper.md#constructor)

### Methods

- [data](Scraper.md#data)

## Constructors

### constructor

• **new Scraper**(`request`, `page`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `request` | [`JupiterRequest`](../interfaces/JupiterRequest.md) | Login details for [https://login.jupitered.com/login/](https://login.jupitered.com/login/) |
| `page` | `Page` | Puppeteer `Page` to initialize `Navigator` |

#### Defined in

[scraper/scraper.ts:20](https://github.com/Wolfiej-k/jupiter-api/blob/e681e95/lib/scraper/scraper.ts#L20)

## Methods

### data

▸ **data**(): `Promise`<[`Student`](Student.md)\>

Scrapes Jupiter data and returns a `Student` object.

**`Remarks`**

If login fails, the result has name "Incorrect credentials". See `Student`, `Course`, `Category`, and `Assignment` for more information about the outputted data structure.

**`Example`**

```ts
const student = await scraper.data()
console.log(student.toString())
```

#### Returns

`Promise`<[`Student`](Student.md)\>

Promise resolving to `Student` object

#### Defined in

[scraper/scraper.ts:39](https://github.com/Wolfiej-k/jupiter-api/blob/e681e95/lib/scraper/scraper.ts#L39)
