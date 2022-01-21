import { MouseEvent, useCallback } from "react";
import { getPopupRole } from "ariakit-utils/dom";
import {
  useBooleanEventCallback,
  useEventCallback,
  useWrapElement,
} from "ariakit-utils/hooks";
import { createMemoComponent, useStore } from "ariakit-utils/store";
import { createElement, createHook } from "ariakit-utils/system";
import { As, Props } from "ariakit-utils/types";
import { BooleanOrCallback } from "ariakit-utils/types";
import {
  CompositeHoverOptions,
  useCompositeHover,
} from "../composite/composite-hover";
import {
  CompositeItemOptions,
  useCompositeItem,
} from "../composite/composite-item";
import { SelectContext, SelectItemCheckedContext } from "./__utils";
import { SelectState } from "./select-state";

const itemRoleByPopupRole = {
  listbox: "option",
  tree: "treeitem",
  grid: "gridcell",
};

function getItemRole(contentElement?: HTMLElement | null) {
  const popupRole = getPopupRole(contentElement);
  if (!popupRole) return;
  return itemRoleByPopupRole[popupRole as keyof typeof itemRoleByPopupRole];
}

/**
 * A component hook that returns props that can be passed to `Role` or any other
 * Ariakit component to render a select item.
 * @see https://ariakit.org/components/select
 * @example
 * ```jsx
 * const state = useSelectState();
 * const props = useSelectItem({ state, value: "Apple" });
 * <Role {...props} />
 * ```
 */
export const useSelectItem = createHook<SelectItemOptions>(
  ({
    state,
    value,
    getItem: getItemProp,
    hideOnClick = value != null,
    setValueOnClick = value != null,
    preventScrollOnKeyDown = true,
    focusOnHover: focusOnHover = true,
    accessibleWhenDisabled = true,
    ...props
  }) => {
    state = useStore(state || SelectContext, [
      useCallback((s: SelectState) => s.value === value, [value]),
      "setValue",
      "hide",
      "contentElement",
      "mounted",
    ]);
    const disabled = props.disabled;

    const getItem = useCallback(
      (item) => {
        const nextItem = { ...item, value: disabled ? undefined : value };
        if (getItemProp) {
          return getItemProp(nextItem);
        }
        return nextItem;
      },
      [disabled, value, getItemProp]
    );

    const onClickProp = useEventCallback(props.onClick);
    const setValueOnClickProp = useBooleanEventCallback(setValueOnClick);
    const hideOnClickProp = useBooleanEventCallback(hideOnClick);

    const onClick = useCallback(
      (event: MouseEvent<HTMLDivElement>) => {
        onClickProp(event);
        if (event.defaultPrevented) return;
        if (setValueOnClickProp(event) && value != null) {
          state?.setValue(value);
        }
        if (hideOnClickProp(event)) {
          state?.hide();
        }
      },
      [
        onClickProp,
        value,
        setValueOnClickProp,
        state?.setValue,
        hideOnClickProp,
        state?.hide,
      ]
    );

    const isSelected = value != null && value === state?.value;

    props = useWrapElement(
      props,
      (element) => (
        <SelectItemCheckedContext.Provider value={isSelected}>
          {element}
        </SelectItemCheckedContext.Provider>
      ),
      [isSelected]
    );

    props = {
      role: getItemRole(state?.contentElement),
      children: value,
      ...props,
      onClick,
    };

    props = useCompositeItem({
      state,
      getItem,
      preventScrollOnKeyDown,
      accessibleWhenDisabled,
      ...props,
    });

    const focusOnHoverProp = useBooleanEventCallback(focusOnHover);

    props = useCompositeHover({
      state,
      ...props,
      // We have to disable focusOnHover when the popup is closed, otherwise
      // the active item will change to null (the container) when the popup is
      // closed by clicking on an item.
      focusOnHover: (event) => {
        if (!focusOnHoverProp(event)) return false;
        return !!state?.mounted;
      },
    });

    return props;
  }
);

/**
 * A component that renders a select item inside a select list or select
 * popover. The `role` prop will be automatically set based on the `SelectList`
 * or `SelectPopover` own `role` prop. For example, if the `SelectPopover`
 * component's `role` prop is set to `listbox` (default), the `SelectItem`
 * `role` will be set to `option`. By default, the `value` prop will be rendered
 * as the children, but this can be overriden.
 * @see https://ariakit.org/components/select
 * @example
 * ```jsx
 * const select = useSelectState();
 * <Select state={select} />
 * <SelectPopover state={select}>
 *   <SelectItem value="Apple" />
 *   <SelectItem value="Orange" />
 * </SelectPopover>
 * ```
 */
export const SelectItem = createMemoComponent<SelectItemOptions>((props) => {
  const htmlProps = useSelectItem(props);
  return createElement("div", htmlProps);
});

export type SelectItemOptions<T extends As = "div"> = Omit<
  CompositeItemOptions<T>,
  "state" | "preventScrollOnKeyDown"
> &
  Omit<CompositeHoverOptions<T>, "state"> & {
    /**
     * Object returned by the `useSelectState` hook. If not provided, the
     * parent `SelectList` or `SelectPopover` components' context will be
     * used.
     */
    state?: SelectState;
    /**
     * The value of the item. This will be rendered as the children by default.
     *   - If `setValueOnClick` is set to `true` on this component, the
     *     `select.value` state will be set to this value when the user clicks
     *     on it.
     *   - If `select.setValueOnMove` is set to `true` on the select state, the
     *     `select.value` state will be set to this value when the user moves to
     *     it (which is usually the case when moving through the items using the
     *     keyboard).
     */
    value?: string;
    /**
     * Whether to hide the select when this item is clicked. By default, tt's
     * `true` when the `value` prop is also provided.
     */
    hideOnClick?: BooleanOrCallback<MouseEvent<HTMLElement>>;
    /**
     * Whether to set the select value with this item's value, if any, when this
     * item is clicked. By default, it's `true` when the `value` prop is also
     * provided.
     */
    setValueOnClick?: BooleanOrCallback<MouseEvent<HTMLElement>>;
    /**
     * Whether the scroll behavior should be prevented when pressing arrow keys
     * on the first or the last items.
     * @default true
     */
    preventScrollOnKeyDown?: CompositeItemOptions["preventScrollOnKeyDown"];
  };

export type SelectItemProps<T extends As = "div"> = Props<SelectItemOptions<T>>;