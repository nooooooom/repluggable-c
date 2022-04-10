import { SlotRenderer } from '@repluggable/vue'
import { ExtensionSlot } from 'repluggable'
import { defineComponent, PropType } from 'vue-demi'
import { ContributedComponent } from '../mainViewAPI'

const slotItemToComp = ({ component }: ContributedComponent) => component

export const MainView = defineComponent({
  props: {
    extensionSlot: {
      type: Object as PropType<ExtensionSlot<ContributedComponent>>,
      required: true
    }
  },
  render() {
    return (
      <div class="MainView">
        <SlotRenderer
          extensionSlot={this.extensionSlot}
          mapFunc={slotItemToComp}
        />
      </div>
    )
  }
})
