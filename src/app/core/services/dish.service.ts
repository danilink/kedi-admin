import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { apiUrl } from '../api-client';
import { Dish, DishCreateDto, DishUpdateDto, ListDishesParams } from '../models/dish.models';

@Injectable({ providedIn: 'root' })
export class DishService {
  constructor(private readonly http: HttpClient) {}

  listDishes(params?: ListDishesParams): Observable<Dish[]> {
    let httpParams = new HttpParams();

    if (params?.q?.trim()) {
      httpParams = httpParams.set('q', params.q.trim());
    }

    if (params?.skip != null) {
      httpParams = httpParams.set('skip', String(params.skip));
    }

    if (params?.limit != null) {
      httpParams = httpParams.set('limit', String(params.limit));
    }

    if (params?.sort_by) {
      httpParams = httpParams.set('sort_by', params.sort_by);
    }

    if (params?.sort_dir) {
      httpParams = httpParams.set('sort_dir', params.sort_dir);
    }

    return this.http.get<Dish[]>(apiUrl('/dishes'), { params: httpParams });
  }

  getDishById(id: number): Observable<Dish> {
    return this.http.get<Dish>(apiUrl(`/dishes/${id}`));
  }

  createDish(payload: DishCreateDto): Observable<Dish> {
    return this.http.post<Dish>(apiUrl('/dishes'), payload);
  }

  updateDish(id: number, payload: DishUpdateDto): Observable<Dish> {
    return this.http.patch<Dish>(apiUrl(`/dishes/${id}`), payload);
  }

  deleteDish(id: number): Observable<void> {
    return this.http.delete<void>(apiUrl(`/dishes/${id}`));
  }
}
