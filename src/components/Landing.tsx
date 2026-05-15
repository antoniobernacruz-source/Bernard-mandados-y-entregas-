import { useAuth } from '../hooks/useAuth';
import { Package, Bike, ArrowRight, ShieldCheck, Clock, Map as MapIcon } from 'lucide-react';
import { motion } from 'motion/react';

export default function Landing() {
  const { signIn } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col items-center justify-center -mt-8 min-h-[calc(100vh-12rem)]">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="text-center max-w-4xl px-4"
      >
        <motion.div variants={itemVariants} className="inline-flex items-center px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-800 text-sm font-medium mb-6 border border-indigo-100">
          <span className="flex h-2 w-2 rounded-full bg-indigo-600 mr-2 animate-pulse"></span>
          Ahora disponible en Huajuapan de León
        </motion.div>
        
        <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 mb-6 leading-[0.9]">
          Mandados y entregas <span className="text-indigo-600 italic block mt-2">sin complicaciones.</span>
        </motion.h1>
        
        <motion.p variants={itemVariants} className="text-xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed">
          Pide lo que necesites o envía paquetes a cualquier lugar de la ciudad con seguimiento en tiempo real y repartidores certificados.
        </motion.p>
        
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <button 
            onClick={() => signIn('client')}
            className="flex items-center justify-center px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 group"
          >
            Quiero pedir un mandado
            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={() => signIn('driver')}
            className="flex items-center justify-center px-8 py-4 bg-white text-gray-900 border-2 border-gray-100 rounded-2xl font-bold text-lg hover:border-indigo-600 transition-all shadow-sm"
          >
            Quiero ser repartidor
            <Bike className="ml-2" />
          </button>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: <Clock className="text-indigo-600" />, title: "Rápido & puntual", desc: "Entregas en minutos, no en horas." },
            { icon: <ShieldCheck className="text-indigo-600" />, title: "Seguro & confiable", desc: "Viajes monitoreados por GPS 24/7." },
            { icon: <MapIcon className="text-indigo-600" />, title: "Mapa interactivo", desc: "Sigue a tu repartidor en tiempo real." }
          ].map((feature, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 text-left shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-snug">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
