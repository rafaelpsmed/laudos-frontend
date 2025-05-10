import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Função para verificar se o usuário está autenticado
  const checkAuth = async () => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/api/auth/me/');
      setUser(response.data);
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      localStorage.removeItem(ACCESS_TOKEN);
      localStorage.removeItem(REFRESH_TOKEN);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Verifica a autenticação ao carregar o componente
  useEffect(() => {
    checkAuth();
  }, []);

  // Função de login
  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login/', { email, password });
      const { access, refresh, user } = response.data;

      // Armazena os tokens
      localStorage.setItem(ACCESS_TOKEN, access);
      localStorage.setItem(REFRESH_TOKEN, refresh);

      // Configura o token no header da API
      api.defaults.headers.common['Authorization'] = `Bearer ${access}`;

      // Atualiza o estado do usuário
      setUser(user);

      return { success: true };
    } catch (error) {
      console.error('Erro no login:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Erro ao fazer login'
      };
    }
  };

  // Função de registro
  const register = async (userData) => {
    try {
      const response = await api.post('/api/auth/register/', userData);
      return { success: true };
    } catch (error) {
      console.error('Erro no registro:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Erro ao registrar'
      };
    }
  };

  // Função de logout
  const logout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}; 