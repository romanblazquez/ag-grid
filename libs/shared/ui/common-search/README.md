# FMR PR000539 Common Search Component

New shared component within monorepo which will support multi select search component. The component will use the idea of consumer apps providing search context and the
component will then use it to fetch data and render it in the way required. This should make integration quick and easy for other apps. As of now there is one context
already available which is fund/pm context. In future more contexts will be added and the ability to override/provide your own contexts will also be available.

The component currently only renders search results in a hierarchical nature for the fund search where funds are rolled up under PM name. As we develop other contexts
which won't use this we will add the ability to just display results in an unranked nature. The component is multi select so unlike the existing suggestible search component in the monorepo we can select multiple results.

This library was generated with [Nx](https://nx.dev).

## Integration

within component.html

```
 <fmr-pr000539-common-search
      [searchContext]="searchContext"
    ></fmr-pr000539-common-search>
```

within ts file

```
public searchContext: SearchContext = {
    searchType: SearchType.FundPm,
  };

```

Other inputs & outputs:

@Input clearSelection - pass any obj to clear and reset the input from parent component

@Output emitSelection - to do any operations on the selected items from the list

@Output clearEvent - any logic if clear is triggered within input box
