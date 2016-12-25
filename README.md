# Responsive data tables

See a live example of the prototype in:
http://krun.github.io/tasty-tables/example.html

This is a component for a data table which offers sorting and incremental search on all of 
its columns.

The data table can perform well (<500ms for initialisation, <100ms sorting and search) with 
dozens of thousands of rows (considering worst case: complex templates with components).

## Cell templates

Every column can define its own template. Defining how each input object is represented.

It supports complex column templates, defined as Angular components (very efficient with AOT 
compilation).

```
@Component({
  template: `
  <p>{{data.str}} - {{data.list.toString()}}</p>
  <ul><li *ngFor="let a of data.list">{{a}}</li></ul>`
})
export class Column1 extends ColumnComponent<DataType> { }

@Component({ template: '<data-table [model]="model"'></data-table>' })
export class MyComponent {
    model = {
        columns: [{ title: "Column 1", component: Column1 }]
        data: [
            {str: "a", list: [1,2,3]}, 
            {str: "b", list: [4,5,6]},
            ...
        ]
    };
}
```

It also supports simple column types, defined as transformation functions.

```

@Component({ template: '<data-table [model]="model"'></data-table>' })
export class MyComponent {
    model = {
        columns: [
            { title: "Column 1", func: (x) => x.list.toString() },
            { title: "Column 1", func: (x) => x.str }
        ]
        data: [
            {str: "a", list: [1,2,3]}, 
            {str: "b", list: [4,5,6]},
            ...
        ]
    };
}
```
