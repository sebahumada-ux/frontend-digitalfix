import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MsalService } from '@azure/msal-angular';

const API_SCOPE =
  'api://fad2db65-7d82-41d8-a0c5-2fa1e2512ee4/access_as_user';

type EstadoConexion = 'conectando' | 'conectado' | 'reconectando' | 'no-disponible';

interface WorkOrder {
  id: number;
  clienteId: number;
  descripcion: string;
  direccion: string;
  tecnicoId: number | null;
  estado: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

interface ServicioCatalogo {
  id: number;
  nombre: string;
  descripcion: string;
  tarifa: number;
  stock: number;
  activo: boolean;
}

interface MetricaEvento {
  eventId: string;
  sourceEventId: string;
  workOrderId: number;
  estado: string;
  categoria: string;
  timestamp: string;
}

interface ResumenAnalytics {
  totalEventos: number;
  porCategoria: Record<string, number>;
  recientes: MetricaEvento[];
}

interface EstadoVisual {
  clave: string;
  etiqueta: string;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {

  protected readonly ordenes = signal<WorkOrder[]>([]);
  protected readonly servicios = signal<ServicioCatalogo[]>([]);
  protected readonly roles = signal<string[]>([]);
  protected readonly resumenAnalytics = signal<ResumenAnalytics | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly errorAnalytics = signal('');
  protected readonly conexion = signal<EstadoConexion>('conectando');
  protected readonly modoPresentacion = signal(false);
  protected readonly ultimaSincronizacion = signal<Date | null>(null);
  protected readonly ultimoEventoEnVivo = signal<string | null>(null);

  protected readonly estados: EstadoVisual[] = [
    { clave: 'CREADA', etiqueta: 'Creadas', color: '#8794aa' },
    { clave: 'ASIGNADA', etiqueta: 'Asignadas', color: '#476b9e' },
    { clave: 'EN_DESPLAZAMIENTO', etiqueta: 'En desplazamiento', color: '#8c7dcc' },
    { clave: 'EN_EJECUCION', etiqueta: 'En ejecución', color: '#d6a05c' },
    { clave: 'CERRADA', etiqueta: 'Cerradas', color: '#309276' },
    { clave: 'CANCELADA', etiqueta: 'Canceladas', color: '#d16e75' }
  ];

  protected readonly totalOrdenes = computed(() => this.ordenes().length);

  protected readonly ordenesActivas = computed(() =>
    this.ordenes().filter(orden =>
      orden.estado !== 'CERRADA' && orden.estado !== 'CANCELADA'
    ).length
  );

  protected readonly ordenesRecientes = computed(() =>
    [...this.ordenes()]
      .sort((a, b) => b.id - a.id)
      .slice(0, 5)
  );

  protected readonly eventosRecientes = computed(() =>
    (this.resumenAnalytics()?.recientes ?? []).slice(0, 7)
  );

  protected readonly categoriasKafka = computed(() =>
    Object.entries(this.resumenAnalytics()?.porCategoria ?? {})
      .sort((a, b) => b[1] - a[1])
  );

  private readonly workordersUrl = '/api/workorders';
  private readonly analyticsUrl = '/api/analytics/resumen';
  private readonly streamUrl = '/api/analytics/stream';
  private readonly catalogUrl =
    'https://12up8d8jsh.execute-api.us-east-1.amazonaws.com/api/bff/catalog/services';

  private eventos?: EventSource;

  constructor(
    private http: HttpClient,
    private authService: MsalService
  ) {}

  ngOnInit(): void {
    this.cargarDashboard();
  }

  ngOnDestroy(): void {
    this.eventos?.close();
    this.eventos = undefined;
  }

  protected alternarPresentacion(): void {
    this.modoPresentacion.update(actual => !actual);
  }

  protected actualizarAhora(): void {
    this.cargarOrdenes();
    this.cargarAnalytics();
  }

  protected contarEstado(estado: string): number {
    return this.ordenes().filter(orden => orden.estado === estado).length;
  }

  protected porcentajeEstado(estado: string): number {
    const total = this.totalOrdenes();
    return total === 0 ? 0 : (this.contarEstado(estado) / total) * 100;
  }

  protected fondoDistribucion(): string {
    const total = this.totalOrdenes();

    if (total === 0) {
      return 'conic-gradient(#e7ebf0 0% 100%)';
    }

    let inicio = 0;
    const partes: string[] = [];

    for (const estado of this.estados) {
      const cantidad = this.contarEstado(estado.clave);
      if (cantidad === 0) {
        continue;
      }
      const fin = inicio + (cantidad / total) * 100;
      partes.push(estado.color + ' ' + inicio + '% ' + fin + '%');
      inicio = fin;
    }

    return 'conic-gradient(' + partes.join(', ') + ')';
  }

  protected rolActual(): string {
    return this.roles()[0] ?? 'Sin rol';
  }

  protected tieneRol(...rolesPermitidos: string[]): boolean {
    const actuales = this.roles().map(rol => rol.toLowerCase());
    return rolesPermitidos.some(rol => actuales.includes(rol.toLowerCase()));
  }

  protected serviciosActivos(): number {
    return this.servicios().filter(servicio => servicio.activo).length;
  }

  protected etiquetaConexion(): string {
    switch (this.conexion()) {
      case 'conectado': return 'Transmisión en vivo';
      case 'reconectando': return 'Reconectando...';
      case 'no-disponible': return 'Streaming no disponible';
      default: return 'Conectando...';
    }
  }

  protected etiquetaCategoria(categoria: string): string {
    return categoria.replace(/_/g, ' ');
  }

  protected etiquetaEstado(estado: string): string {
    return this.estados.find(item => item.clave === estado)?.etiqueta ?? estado.replace(/_/g, ' ');
  }

  protected formatearFecha(fecha: string): string {
    const valor = new Date(fecha);
    return Number.isNaN(valor.getTime()) ? '-' : valor.toLocaleString('es-CL');
  }

  protected formatearHora(fecha: string | Date | null): string {
    if (!fecha) {
      return '--:--:--';
    }
    const valor = new Date(fecha);
    return Number.isNaN(valor.getTime())
      ? '--:--:--'
      : valor.toLocaleTimeString('es-CL', { hour12: false });
  }

  private cargarDashboard(): void {
    const account =
      this.authService.instance.getActiveAccount() ??
      this.authService.instance.getAllAccounts()[0];

    if (!account) {
      this.error.set('No se encontró una sesión activa.');
      this.cargando.set(false);
      this.conexion.set('no-disponible');
      return;
    }

    this.authService.acquireTokenSilent({
      scopes: [API_SCOPE],
      account,
      forceRefresh: true
    }).subscribe({
      next: result => {
        this.roles.set(this.obtenerRolesDesdeToken(result.accessToken));
        this.cargarOrdenes();
        this.cargarAnalytics();
        this.conectarStreaming();

        if (this.tieneRol('Admin', 'Supervisor')) {
          this.cargarCatalogo();
        }
      },
      error: error => {
        console.error('Error obteniendo token:', error);
        this.error.set('No fue posible obtener los permisos del usuario.');
        this.cargando.set(false);
        this.conexion.set('no-disponible');
      }
    });
  }

  private conectarStreaming(): void {
    if (this.eventos) {
      return;
    }

    if (typeof EventSource === 'undefined') {
      this.conexion.set('no-disponible');
      return;
    }

    const conexion = new EventSource(this.streamUrl);
    this.eventos = conexion;

    conexion.onopen = () => {
      this.conexion.set('conectado');
    };

    conexion.onerror = () => {
      // EventSource reintenta la conexión automáticamente.
      this.conexion.set('reconectando');
    };

    conexion.addEventListener('conectado', () => {
      // Recupera los cambios que pudieron llegar mientras estuvo desconectado.
      this.actualizarDatosSilenciosamente();
    });

    conexion.addEventListener('orden-actualizada', evento => {
      try {
        const metrica = JSON.parse((evento as MessageEvent).data) as Partial<MetricaEvento>;
        if (typeof metrica.eventId === 'string') {
          this.ultimoEventoEnVivo.set(metrica.eventId);
        }
      } catch {
        // Aunque el payload sea ilegible, siempre se consulta el estado real.
      }

      this.actualizarDatosSilenciosamente();
    });
  }

  private actualizarDatosSilenciosamente(): void {
    this.cargarOrdenes();
    this.cargarAnalytics();
  }

  private cargarOrdenes(): void {
    this.http.get<WorkOrder[]>(this.workordersUrl).subscribe({
      next: datos => {
        this.ordenes.set(datos);
        this.error.set('');
        this.cargando.set(false);
        this.ultimaSincronizacion.set(new Date());
      },
      error: error => {
        console.error('Error cargando órdenes:', error);
        this.error.set('No fue posible actualizar las órdenes de trabajo.');
        this.cargando.set(false);
      }
    });
  }

  private cargarAnalytics(): void {
    this.http.get<ResumenAnalytics>(this.analyticsUrl).subscribe({
      next: datos => {
        this.resumenAnalytics.set(datos);
        this.errorAnalytics.set('');
      },
      error: error => {
        console.error('Error cargando Kafka Analytics:', error);
        this.errorAnalytics.set('No se pudo cargar el resumen de Kafka Analytics.');
      }
    });
  }

  private cargarCatalogo(): void {
    this.http.get<ServicioCatalogo[]>(this.catalogUrl).subscribe({
      next: datos => this.servicios.set(datos),
      error: error => console.error('Error cargando catálogo:', error)
    });
  }

  private obtenerRolesDesdeToken(token: string): string[] {
    try {
      const payload = token.split('.')[1];
      if (!payload) {
        return [];
      }

      const base64 = payload
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(payload.length / 4) * 4, '=');

      const claims = JSON.parse(atob(base64));
      return Array.isArray(claims.roles) ? claims.roles : [];
    } catch {
      return [];
    }
  }
}
