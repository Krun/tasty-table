import { Component, ViewChildren, QueryList, ChangeDetectorRef } from '@angular/core';
import { BasicColumnComponent, TableComponent } from './table.component';

interface DataType {
  first: number;
  second: string;
  third: string[];
}

@Component({ template: '{{data.first}}' })
export class Column1 extends BasicColumnComponent<DataType> { }

@Component({ 
  template: `
    <ul>
      <li *ngFor="let s of data.third">{{s}}</li>
    </ul>`
    })
export class Column2 extends BasicColumnComponent<DataType> { }

@Component({ template: '<p>{{data.first}} - {{data.second}}</p>' })
export class Column3 extends BasicColumnComponent<DataType> { }

@Component({
  selector: 'my-app',
  template: `
    <h1>Responsive Data Tables</h1>
    Number of data rows: <input [(ngModel)]="numberOfRows" (ngModelChange)="updateData()" type="number">
    <label> With checkboxes <input type="checkbox" [(ngModel)]="selectable"></label>
    <data-table title="Example" [columns]="columns1" [data]="data" [selectable]="selectable" (selectionChange)="tableSelect($event)"></data-table>
    <data-table title="Example2"></data-table>
  `,
})
export class AppComponent {
  selectable = true;
  numberOfRows = 5000;
  columns1 = [
    { title: "Column 1", component: Column1, numeric: true },
    { title: "Column 2", component: Column2 },
    { title: "Column 3", component: Column3 },
    { title: "Column 4", func: (x: DataType) => x.second },
    { title: "Column 5", func: (x: DataType) => x.first },
  ];

  columns2 = [
    { title: "Column 1", func: (x: DataType) => String(x.first) },
    { title: "Column 2", func: (x: DataType) => x.second }
  ]

  data: DataType[];

  @ViewChildren(TableComponent) tableComponents: QueryList<TableComponent>;

  constructor(private changeDetector: ChangeDetectorRef) { }

  tableSelect(event: number) {
    console.log(event);
  }

  ngAfterViewInit() {
    this.updateData();
  }

  updateData() {
    this.data = Array(this.numberOfRows).fill(0).map((_, i) => ({ first: i, second: "b" + (3000 - i), third: ["a" + i, "b" + i] }));
    this.changeDetector.detectChanges();
    const tables = this.tableComponents.toArray();
    tables[1].setData({ columns: this.columns1, data: this.data });
  }
}
