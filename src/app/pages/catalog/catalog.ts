import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface ServicioCatalogo {
  id: number;
  nombre: string;
  descripcion: string;
  tarifa: number;
  stock: number;
  activo: boolean;
}

@Component({
  selector: 'app-catalog',
  imports: [],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css'
})
export class Catalog implements OnInit {

  protected readonly servicios = signal<ServicioCatalogo[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  private readonly apiUrl =
    'https://12up8d8jsh.execute-api.us-east-1.amazonaws.com/api/bff/catalog/services';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarCatalogo();
  }

  cargarCatalogo(): void {
    this.cargando.set(true);
    this.error.set('');

    this.http.get<ServicioCatalogo[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.servicios.set(data);
        this.cargando.set(false);
      },
      error: (error) => {
        console.error('Error al cargar catálogo:', error);
        this.error.set('No fue posible cargar el catálogo.');
        this.cargando.set(false);
      }
    });
  }
}