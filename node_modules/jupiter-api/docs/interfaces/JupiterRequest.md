[jupiter-api](../README.md) / JupiterRequest

# Interface: JupiterRequest

Template for Jupiter login details.

## Table of contents

### Properties

- [id](JupiterRequest.md#id)
- [password](JupiterRequest.md#password)
- [school](JupiterRequest.md#school)
- [city](JupiterRequest.md#city)
- [state](JupiterRequest.md#state)

## Properties

### id

• **id**: `string`

Student ID number, often a 9-digit code

#### Defined in

[scraper/request.ts:6](https://github.com/Wolfiej-k/jupiter-api/blob/e681e95/lib/scraper/request.ts#L6)

___

### password

• **password**: `string`

Student password

#### Defined in

[scraper/request.ts:9](https://github.com/Wolfiej-k/jupiter-api/blob/e681e95/lib/scraper/request.ts#L9)

___

### school

• **school**: `string`

School with Jupiter services

#### Defined in

[scraper/request.ts:12](https://github.com/Wolfiej-k/jupiter-api/blob/e681e95/lib/scraper/request.ts#L12)

___

### city

• **city**: `string`

City where school is located

#### Defined in

[scraper/request.ts:15](https://github.com/Wolfiej-k/jupiter-api/blob/e681e95/lib/scraper/request.ts#L15)

___

### state

• **state**: `string`

State where school is located

**`Remarks`**

Jupiter uses a 5-digit code to represent states. US: `us_##`\, Canada: `ca_##`\, where `##` is the state code (e.g. NY).

#### Defined in

[scraper/request.ts:22](https://github.com/Wolfiej-k/jupiter-api/blob/e681e95/lib/scraper/request.ts#L22)
