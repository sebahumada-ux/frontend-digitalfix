import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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

interface CrearWorkOrderRequest {
  clienteId: number;
  descripcion: string;
  direccion: string;
  tecnicoId: number | null;
}

interface ActualizarEstadoRequest {
  estado: string;
}

@Component({
  selector: 'app-workorders',
  imports: [FormsModule],
  templateUrl: './workorders.html',
  styleUrl: './workorders.css'
})
export class Workorders implements OnInit {

  protected readonly ordenes = signal<WorkOrder[]>([]);
  protected readonly cargando = signal(true);
  protected readonly creando = signal(false);
  protected readonly actualizandoId =
    signal<number | null>(null);

  protected readonly puedeCambiarEstado =
    signal(false);

  protected readonly error = signal('');
  protected readonly mensaje = signal('');

  protected clienteId: number | null = null;
  protected descripcion = '';
  protected direccion = '';
  protected tecnicoId: number | null = null;

  protected estadoSeleccionado: Record<number, string> = {};

  private readonly apiUrl =
    'https://12up8d8jsh.execute-api.us-east-1.amazonaws.com/api/bff/workorders';

  constructor(
    private http: HttpClient,
    private authService: MsalService
  ) {}

  ngOnInit(): void {
    this.cargarPermisos();
    this.cargarOrdenes();
  }

  cargarOrdenes(): void {

    this.cargando.set(true);
    this.error.set('');

    this.http
      .get<WorkOrder[]>(this.apiUrl)
      .subscribe({

        next: (data) => {

          this.ordenes.set(data);

          for (const orden of data) {

            const permitidos =
              this.estadosPermitidos(orden);

            if (permitidos.length > 0) {
              this.estadoSeleccionado[orden.id] =
                permitidos[0];
            }
          }

          this.cargando.set(false);
        },

        error: (error) => {

          console.error(
            'Error al cargar órdenes:',
            error
          );

          this.error.set(
            'No fue posible cargar las órdenes de trabajo.'
          );

          this.cargando.set(false);
        }
      });
  }

  crearOrden(): void {

    this.error.set('');
    this.mensaje.set('');

    if (
      this.clienteId === null ||
      !this.descripcion.trim() ||
      !this.direccion.trim()
    ) {

      this.error.set(
        'Completa los campos obligatorios.'
      );

      return;
    }

    const nuevaOrden: CrearWorkOrderRequest = {

      clienteId: this.clienteId,

      descripcion:
        this.descripcion.trim(),

      direccion:
        this.direccion.trim(),

      tecnicoId:
        this.tecnicoId
    };

    this.creando.set(true);

    this.http
      .post<WorkOrder>(
        this.apiUrl,
        nuevaOrden
      )
      .subscribe({

        next: () => {

          this.mensaje.set(
            'Orden de trabajo creada correctamente.'
          );

          this.limpiarFormulario();

          this.creando.set(false);

          this.cargarOrdenes();
        },

        error: (error) => {

          console.error(
            'Error al crear orden:',
            error
          );

          this.error.set(
            'No fue posible crear la orden de trabajo.'
          );

          this.creando.set(false);
        }
      });
  }

  actualizarEstado(
    orden: WorkOrder
  ): void {

    this.error.set('');
    this.mensaje.set('');

    const nuevoEstado =
      this.estadoSeleccionado[orden.id];

    if (!nuevoEstado) {

      this.error.set(
        'Selecciona un estado válido.'
      );

      return;
    }

    const request:
      ActualizarEstadoRequest = {

      estado: nuevoEstado
    };

    this.actualizandoId.set(
      orden.id
    );

    this.http
      .put<WorkOrder>(
        `${this.apiUrl}/${orden.id}/status`,
        request
      )
      .subscribe({

        next: () => {

          this.mensaje.set(
            `Estado de la orden #${orden.id} actualizado correctamente.`
          );

          this.actualizandoId.set(null);

          this.cargarOrdenes();
        },

        error: (error) => {

          console.error(
            'Error al actualizar estado:',
            error
          );

          if (error.status === 403) {

            this.error.set(
              'No tienes permisos para cambiar el estado.'
            );

          } else if (error.status === 400) {

            this.error.set(
              'La transición de estado seleccionada no está permitida.'
            );

          } else {

            this.error.set(
              'No fue posible actualizar el estado de la orden.'
            );
          }

          this.actualizandoId.set(null);
        }
      });
  }

  protected estadosPermitidos(
    orden: WorkOrder
  ): string[] {

    switch (orden.estado) {

      case 'CREADA':
        return [
          'ASIGNADA',
          'CANCELADA'
        ];

      case 'ASIGNADA':
        return [
          'EN_DESPLAZAMIENTO',
          'CANCELADA'
        ];

      case 'EN_DESPLAZAMIENTO':
        return [
          'EN_EJECUCION',
          'CANCELADA'
        ];

      case 'EN_EJECUCION':
        return [
          'CERRADA',
          'CANCELADA'
        ];

      case 'CERRADA':
      case 'CANCELADA':
        return [];

      default:
        return [];
    }
  }

  private cargarPermisos(): void {

    const account =
      this.authService.instance.getActiveAccount() ??
      this.authService.instance.getAllAccounts()[0];

    if (!account) {

      this.puedeCambiarEstado.set(false);

      return;
    }

    this.authService
      .acquireTokenSilent({
        scopes: [API_SCOPE],
        account
      })
      .subscribe({

        next: (result) => {

          const roles =
            this.obtenerRolesDesdeToken(
              result.accessToken
            )
              .map(
                rol =>
                  rol.toLowerCase()
              );

          this.puedeCambiarEstado.set(
            roles.includes('admin') ||
            roles.includes('supervisor')
          );
        },

        error: () => {

          this.puedeCambiarEstado.set(
            false
          );
        }
      });
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

  private limpiarFormulario(): void {

    this.clienteId = null;
    this.descripcion = '';
    this.direccion = '';
    this.tecnicoId = null;
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
}