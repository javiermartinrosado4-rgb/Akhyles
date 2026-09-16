# Akhyles Points · modelo v3 beta

Implementación propia, no clon exacto de Symmetric Strength. Escala orientativa sin techo: `1000 × (fuerza / 120)²`. Fuerza interna 37 equivale a 95,1 puntos; 120 a 1.000; 240 a 4.000. No son percentiles ni niveles clínicamente validados.

## Cálculo y cobertura

1. Carga externa total; por lado se normaliza al guardar, sin volver a duplicarla. Campo Peso de la barra configurable de 0 a 100 kg (admite decimales y 0). Los tres básicos proponen 20 kg y los demás 0. Se guarda por ejercicio para próximas sesiones y en cada registro histórico. La barra se añade una sola vez; si el total introducido ya la incluye, usar 0. Dos mancuernas: sumar ambas; unilateral: carga del lado trabajado. Las máquinas no reciben una barra ficticia por defecto.
2. Dominadas/fondos suman el peso corporal al lastre. Dominadas asistidas restan los kilos de ayuda. Carga efectiva no positiva no puntúa.
3. Máximo estimado Wathan, con repetición única observada sin extrapolar. Repeticiones 11–100 se conservan pero no añaden beneficio respecto a 10; valores inválidos se excluyen.
4. Ajuste Wilks clásico según sexo y peso corporal de la sesión. No extrapolamos fuera de 40–200 kg (hombres), 40–150 (mujeres). No se aplica corrección por edad.
5. Las proporciones públicas de banca/sentadilla/peso muerto se extienden a 86 referencias explícitas en `src/logic/scoreReferences.ts`. Todas las nuevas proporciones son decisiones de calibración de producto, NO resultados de investigación ni equivalencias biomecánicas demostradas. Pueden ser imprecisas por poleas, palancas, recorrido, posición o maquinaria.
6. Mejor puntuación histórica por grupo principal; secundarios no se cuentan de nuevo. Pesos fijos: pecho/espalda/cuádriceps/isquios 15% cada uno; hombros/glúteos 10%; bíceps/tríceps 5%; gemelos/abdominales 4%; aductores 2%. Un grupo sin datos no aporta al total, pero no se afirma que la persona tenga fuerza cero. Así, registrar grupos nuevos mejora cobertura además de puntuación, sin multiplicar puntos por cantidad de ejercicios.

Cada grupo se muestra en la misma escala orientativa, con ≈ cuando su mejor referencia es una analogía. El total transforma la suma ponderada de fuerzas internas, no suma los puntos mostrados de cada grupo.

## Históricos, privacidad y ranking

Sexo y peso quedan asociados a la sesión. Registros antiguos sin sexo solo pueden usar un perfil histórico fechado, nunca el perfil actual. Sin datos históricos suficientes no se inventan puntos. Añadir un ejercicio futuro no cambia los puntos de fechas anteriores. Editar o borrar una marca incorrecta sí recalcula los máximos afectados.

No hay migración destructiva de pesos antiguos: si se registró una sola mancuerna como si fuera total, el dato requiere revisión del usuario; no se dobla automáticamente. Nuevas instrucciones explicitan la convención.

Ranking voluntario beta, solo modelo v3, mínimo pecho/espalda/cuádriceps/isquios y cobertura visible. Se publican puntos/cobertura, no sexo ni peso bruto salvo la opción separada de compartir peso. Las cifras son declaradas por el cliente: no constituye un sistema antitrampas ni una competición verificada. Antes de un ranking competitivo público se necesita cálculo autoritativo en servidor, validación de evidencias y calibración con muestras reales por ejercicio/equipo. No mezclar versiones al recalibrar referencias.

## Fuentes revisadas el 11-09-2026

- [Metodología pública de Symmetric Strength](https://symmetricstrength.com/about): marco por levantamiento, Wathan y proporciones de los básicos. No proporciona nuestras equivalencias de máquinas.
- [Tabla original Wilks de la EPF](https://www.europowerlifting.org/fileadmin/data/wilks_formula/Wilksformula_01.pdf): contraste numérico de los coeficientes. Atención a la transcripción del término femenino de quinto grado en otros documentos; se usa `-9.054e-8`.
- [Investigación con la ecuación Wathan](https://www.mirlabs.org/ijcisim/regular_papers_2018/IJCISIM_6.pdf).

## Estado de entrega

Integrado en código, gráficas, perfiles compartidos y servidor social local. No publicado aún en APK/web de producción. El bloqueo de dominio de cuentas IONOS y el despliegue del servidor social son trabajos distintos.
