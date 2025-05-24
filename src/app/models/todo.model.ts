export interface Todo {
  id?: number; // Supabase'den otomatik atanacak
  task: string;
  is_completed: boolean;
  created_at?: string; // Supabase'den otomatik atanacak
  user_id?: string; // Kullanıcı bazlı todo'lar için (opsiyonel, bu örnekte kullanılmıyor)
}
