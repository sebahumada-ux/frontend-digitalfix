import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MsalService } from '@azure/msal-angular';

const API_SCOPE =
  'api://fad2db65-7d82-41d8-a0c5-2fa1e2512ee4/access_as_user';

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

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  protected readonly ordenes =
    signal<WorkOrder[]>([]);

  protected readonly servicios =
    signal<ServicioCatalogo[]>([]);

  protected readonly roles =
    signal<string[]>([]);

  protected readonly cargando =
    signal(true);

  protected readonly error =
    signal('');

  private readonly workordersUrl =
    'https://12up8d8jsh.execute-api.us-east-1.amazonaws.com/api/bff/workorders';

  private readonly catalogUrl =
    'https://12up8d8jsh.execute-api.us-east-1.amazonaws.com/api/bff/catalog/services';

  constructor(
    private http: HttpClient,
    private authService: MsalService
  ) {}

  ngOnInit(): void {
    this.cargarDashboard();
  }

  private cargarDashboard(): void {

    const account =
      this.authService.instance.getActiveAccount() ??
      this.authService.instance.getAllAccounts()[0];

    if (!account) {
      this.error.set(
        'No se encontró una sesión activa.'
      );
      this.cargando.set(false);
      return;
    }

    this.authService.acquireTokenSilent({
      scopes: [API_SCOPE],
      account
    }).subscribe({

      next: (result) => {

        const roles =
          this.obtenerRolesDesdeToken(
            result.accessToken
          );

        this.roles.set(roles);

        this.cargarOrdenes();

        if (
          this.tieneRol(
            'Admin',
            'Supervisor'
          )
        ) {
          this.cargarCatalogo();
        }
      },

      error: (error) => {

        console.error(
          'Error obteniendo token:',
          error
        );

        this.error.set(
          'No fue posible obtener los permisos del usuario.'
        );

        this.cargando.set(false);
      }
    });
  }

  private cargarOrdenes(): void {

    this.http
      .get<WorkOrder[]>(
        this.workordersUrl
      )
      .subscribe({

        next: (data) => {

          this.ordenes.set(data);

          this.cargando.set(false);
        },

        error: (error) => {

          console.error(
            'Error cargando órdenes:',
            error
          );

          this.error.set(
            'No fue posible cargar el resumen de órdenes.'
          );

          this.cargando.set(false);
        }
      });
  }

  private cargarCatalogo(): void {

    this.http
      .get<ServicioCatalogo[]>(
        this.catalogUrl
      )
      .subscribe({

        next: (data) => {
          this.servicios.set(data);
        },

        error: (error) => {

          console.error(
            'Error cargando catálogo:',
            error
          );
        }
      });
  }

  protected tieneRol(
    ...rolesPermitidos: string[]
  ): boolean {

    const rolesUsuario =
      this.roles()
        .map(
          rol =>
            rol.toLowerCase()
        );

    return rolesPermitidos.some(
      rol =>
        rolesUsuario.includes(
          rol.toLowerCase()
        )
    );
  }

  protected rolActual(): string {

    if (this.roles().length === 0) {
      return 'Sin rol';
    }

    return this.roles()[0];
  }

  protected contarEstado(
    estado: string
  ): number {

    return this.ordenes()
      .filter(
        orden =>
          orden.estado === estado
      )
      .length;
  }

  protected ordenesActivas(): number {

    return this.ordenes()
      .filter(
        orden =>
          orden.estado !== 'CERRADA' &&
          orden.estado !== 'CANCELADA'
      )
      .length;
  }

  protected serviciosActivos(): number {

    return this.servicios()
      .filter(
        servicio =>
          servicio.activo
      )
      .length;
  }

  protected ordenesRecientes(): WorkOrder[] {

    return [...this.ordenes()]
      .sort(
        (a, b) =>
          b.id - a.id
      )
      .slice(0, 3);
  }

  protected formatearFecha(
    fecha: string
  ): string {

    if (!fecha) {
      return '-';
    }

    return new Date(fecha)
      .toLocaleString('es-CL');
  }

  private obtenerRolesDesdeToken(
    token: string
  ): string[] {

    try {

      const payload =
        token.split('.')[1];

      if (!payload) {
        return [];
      }

      const base64 =
        payload
          .replace(/-/g, '+')
          .replace(/_/g, '/')
          .padEnd(
            Math.ceil(
              payload.length / 4
            ) * 4,
            '='
          );

      const claims =
        JSON.parse(
          atob(base64)
        );

      if (
        Array.isArray(
          claims.roles
        )
      ) {
        return claims.roles;
      }

      return [];

    } catch {

      return [];
    }
  }
}