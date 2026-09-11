import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

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
  protected readonly error = signal('');
  protected readonly mensaje = signal('');

  protected clienteId: number | null = null;
  protected descripcion = '';
  protected direccion = '';
  protected tecnicoId: number | null = null;

  private readonly apiUrl =
    'https://12up8d8jsh.execute-api.us-east-1.amazonaws.com/api/bff/workorders';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarOrdenes();
  }

  cargarOrdenes(): void {
    this.cargando.set(true);
    this.error.set('');

    this.http.get<WorkOrder[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.ordenes.set(data);
        this.cargando.set(false);
      },
      error: (error) => {
        console.error('Error al cargar órdenes:', error);
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
      descripcion: this.descripcion.trim(),
      direccion: this.direccion.trim(),
      tecnicoId: this.tecnicoId
    };

    this.creando.set(true);

    this.http.post<WorkOrder>(
      this.apiUrl,
      nuevaOrden
    ).subscribe({
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

  private limpiarFormulario(): void {
    this.clienteId = null;
    this.descripcion = '';
    this.direccion = '';
    this.tecnicoId = null;
  }

  protected formatearFecha(fecha: string): string {
    if (!fecha) {
      return '-';
    }

    return new Date(fecha)
      .toLocaleString('es-CL');
  }
}