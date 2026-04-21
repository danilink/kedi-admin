export type DishSortBy = 'code' | 'name' | 'price' | 'created_at' | 'updated_at';
export type DishSortDir = 'asc' | 'desc';

export interface Dish {
  id: number;
  code: string;
  name: string;
  description: string | null;
  price: string;
  is_by_weight: boolean;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DishCreateDto {
  code: string;
  name: string;
  description: string | null;
  price: string;
  is_by_weight: boolean;
  image_url: string | null;
  is_active: boolean;
}

export interface DishUpdateDto {
  code?: string;
  name?: string;
  description?: string | null;
  price?: string;
  is_by_weight?: boolean;
  image_url?: string | null;
  is_active?: boolean;
}

export interface ListDishesParams {
  q?: string;
  skip?: number;
  limit?: number;
  sort_by?: DishSortBy;
  sort_dir?: DishSortDir;
}
