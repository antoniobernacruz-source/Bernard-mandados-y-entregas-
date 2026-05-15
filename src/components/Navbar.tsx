import { useAuth } from '../hooks/useAuth';
import { Package, LogOut, User, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-2"
          >
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-indigo-200 shadow-lg">
              <Package size={24} />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-xl font-bold tracking-tighter text-gray-900">BERNARD</span>
              <div className="flex items-center text-[10px] text-gray-500 font-medium uppercase tracking-widest">
                <MapPin size={10} className="mr-1 text-indigo-600" />
                Huajuapan
              </div>
            </div>
          </motion.div>

          {user && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-sm font-semibold text-gray-900">{user.displayName}</span>
                <span className="text-[10px] uppercase tracking-wider text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                  {user.role === 'driver' ? 'Repartidor' : 'Cliente'}
                </span>
              </div>
              <div className="relative group">
                <img 
                  src={user.photoURL || 'https://via.placeholder.com/40'} 
                  alt={user.displayName} 
                  className="w-10 h-10 rounded-full border-2 border-indigo-100 hover:border-indigo-600 transition-all cursor-pointer shadow-sm"
                  referrerPolicy="no-referrer"
                />
              </div>
              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                title="Cerrar Sesión"
              >
                <LogOut size={20} />
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </nav>
  );
}
