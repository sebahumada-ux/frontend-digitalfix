import { Component, OnInit, signal } from '@angular/core';
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

@Component({
  selector: 'app-workorders',
  imports: [],
  templateUrl: './workorders.html',
  styleUrl: './workorders.css'
})
export class Workorders implements OnInit {

  protected readonly ordenes = signal<WorkOrder[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

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
        this.error.set('No fue posible cargar las órdenes de trabajo.');
        this.cargando.set(false);
      }
    });
  }

  protected formatearFecha(fecha: string): string {
    if (!fecha) {
      return '-';
    }

    return new Date(fecha).toLocaleString('es-CL');
  }
}