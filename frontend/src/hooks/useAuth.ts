import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { usersService } from '@/services/users.service';

export function useAuth() {
  const { user, accessToken, login, logout, setUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (accessToken && !user) {
      usersService.getProfile().then(setUser).catch(logout);
    }
  }, [accessToken, user, setUser, logout]);

  return { user, isAuthenticated: !!accessToken, login, logout };
}

export function useRequireAuth() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) navigate('/login', { replace: true });
  }, [isAuthenticated, navigate]);

  return isAuthenticated;
}
