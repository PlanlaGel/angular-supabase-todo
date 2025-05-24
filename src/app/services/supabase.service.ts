import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Todo } from '../models/todo.model';
import { BehaviorSubject, from, map, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private _todos$ = new BehaviorSubject<Todo[]>([]);
  public todos$: Observable<Todo[]> = this._todos$.asObservable();

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  // Supabase'de 'todos' adında bir tablo oluşturduğunuzu varsayıyoruz.
  // Sütunlar: id (int8, primary key, auto-increment), task (text),
  // is_completed (boolean, default: false), created_at (timestamp with time zone, default: now())
  // İsteğe bağlı: user_id (uuid, foreign key to auth.users.id)

  async fetchTodos(): Promise<void> {
    const { data, error } = await this.supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching todos:', error.message);
      this._todos$.next([]);
      return;
    }
    this._todos$.next(data || []);
  }

  // Alternatif: Observable döndüren fetch metodu
  getTodosObservable(): Observable<Todo[]> {
    return from(
      this.supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false })
    ).pipe(
      map((response) => {
        if (response.error) {
          console.error(
            'Error fetching todos (Observable):',
            response.error.message
          );
          throw response.error;
        }
        return response.data || [];
      }),
      tap((todos) => this._todos$.next(todos)) // BehaviorSubject'i güncelle
    );
  }

  async addTodo(task: string): Promise<Todo | null> {
    if (!task.trim()) {
      console.warn('Task cannot be empty');
      return null;
    }
    const { data, error } = await this.supabase
      .from('todos')
      .insert([{ task: task, is_completed: false }])
      .select() // Eklenen kaydı geri döndürür
      .single(); // Tek bir kayıt beklediğimizi belirtir

    if (error) {
      console.error('Error adding todo:', error.message);
      return null;
    }
    if (data) {
      // Yerel state'i güncelle
      const currentTodos = this._todos$.getValue();
      this._todos$.next([data, ...currentTodos]);
    }
    return data;
  }

  async updateTodoStatus(
    id: number,
    is_completed: boolean
  ): Promise<Todo | null> {
    const { data, error } = await this.supabase
      .from('todos')
      .update({ is_completed })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating todo:', error.message);
      return null;
    }
    if (data) {
      // Yerel state'i güncelle
      const currentTodos = this._todos$.getValue();
      const updatedTodos = currentTodos.map((todo) =>
        todo.id === id ? { ...todo, is_completed: data.is_completed } : todo
      );
      this._todos$.next(updatedTodos);
    }
    return data;
  }

  async updateTodoTask(id: number, task: string): Promise<Todo | null> {
    if (!task.trim()) {
      console.warn('Task cannot be empty for update');
      return null;
    }
    const { data, error } = await this.supabase
      .from('todos')
      .update({ task })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating todo task:', error.message);
      return null;
    }
    if (data) {
      // Yerel state'i güncelle
      const currentTodos = this._todos$.getValue();
      const updatedTodos = currentTodos.map((todo) =>
        todo.id === id ? { ...todo, task: data.task } : todo
      );
      this._todos$.next(updatedTodos);
    }
    return data;
  }

  async deleteTodo(id: number): Promise<boolean> {
    const { error } = await this.supabase.from('todos').delete().eq('id', id);

    if (error) {
      console.error('Error deleting todo:', error.message);
      return false;
    }
    // Yerel state'i güncelle
    const currentTodos = this._todos$.getValue();
    this._todos$.next(currentTodos.filter((todo) => todo.id !== id));
    return true;
  }

  // Supabase Realtime ile değişiklikleri dinleme (opsiyonel)
  listenToTodoChanges() {
    this.supabase
      .channel('public:todos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos' },
        (payload) => {
          console.log('Change received!', payload);
          // Gelen değişikliğe göre _todos$ BehaviorSubject'ini güncelleyebilirsiniz.
          // Örneğin, yeni bir todo eklendiğinde veya güncellendiğinde fetchTodos'u tekrar çağırabilirsiniz.
          // Daha granüler güncellemeler için payload.new ve payload.old kullanılabilir.
          this.fetchTodos(); // Basit bir yaklaşım, tüm listeyi yeniden çeker.
        }
      )
      .subscribe();
  }
}
