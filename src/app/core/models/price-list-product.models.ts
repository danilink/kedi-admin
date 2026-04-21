export interface PriceListProduct {
  id: string;
  cod: string;
  precio: string;
  denominacion: string;
  byWeight: boolean;
  insertDate: string;
  updateDate: string;
}

export interface CreateProductPayload {
  cod: string;
  precio: string;
  denominacion: string;
  byWeight: boolean;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export interface ListProductsParams {
  page?: number;
  page_size?: number;
  q?: string;
}

export interface DeleteProductResponse {
  id: string;
  deleted: boolean;
}
