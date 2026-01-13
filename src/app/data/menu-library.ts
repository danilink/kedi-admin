export type MenuLibrary = {
  version: 1;
  primeros: string[];
  segundos: string[];
  postres: string[];
};

export const EMPTY_LIBRARY: MenuLibrary = {
  version: 1,
  primeros: [],
  segundos: [],
  postres: [],
};
