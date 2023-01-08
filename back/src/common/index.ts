import { warn } from "console";

export interface None {
  _tag: "None";
}

export interface Some<T> {
  _tag: "Some";
  readonly value: T;
}

export type Option<T> = None | Some<T>;

export function none(): None {
  return { _tag: "None" };
}

export function some<T>(value: T): Some<T> {
  return { _tag: "Some", value };
}
