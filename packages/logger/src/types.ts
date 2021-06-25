export type TabularPrimatives = string[] | Record<string, string>

export type TabularCompoundCollection =
  | string[][]
  | Record<string, string>[]
  | Record<string, Record<string, string>>

export type TabularData = TabularPrimatives | TabularCompoundCollection
