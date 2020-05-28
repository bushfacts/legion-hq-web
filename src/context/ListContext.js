import React, { useState, useEffect, useContext, createContext } from 'react';
import Axios from 'axios';
import DataContext from 'context/DataContext';
import ErrorFallback from 'common/ErrorFallback';
import LoadingWidget from 'common/LoadingWidget';
import factions from 'constants/factions';
import urls from 'constants/urls';
import {
  convertHashToList,
  toggleListMode,
  changeListTitle,
  addUnit,
  addCommand,
  removeCommand,
  addCounterpart,
  removeCounterpart,
  addBattle,
  removeBattle,
  incrementUnit,
  decrementUnit,
  equipUpgrade,
  unequipUpgrade,
  getEligibleCommandsToAdd,
  getEligibleUnitsToAdd,
  getEquippableUpgrades,
  getEquippableLoadoutUpgrades,
  getEligibleBattlesToAdd
} from 'constants/listOperations';
import listTemplate from 'constants/listTemplate';

const ListContext = createContext();
const httpClient = Axios.create();
httpClient.defaults.timeout = 10000;

function isValidListId(listId) {
  return Number.parseInt(listId) > 999 && Number.parseInt(listId) < 999999;
}

export function ListProvider({
  width, children, slug, listHash, storedLists, updateStoredList
}) {
  const { userSettings } = useContext(DataContext);
  const [stackSize, setStackSize] = useState(1);
  const [isApplyToAll, setIsApplyToAll] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState();
  const [message, setMessage] = useState();
  const [currentList, setCurrentList] = useState();
  const [leftPaneWidth, setLeftPaneWidth] = useState(0);
  const [rightPaneWidth, setRightPaneWidth] = useState(0);
  const [modalContent, setModalContent] = useState();
  const [cardPaneFilter, setCardPaneFilter] = useState({ action: 'DISPLAY' });

  useEffect(() => {
    // route '/list/rebels' fetches the rebel list from storage
    if (slug in factions) {
      if (listHash) {
        const convertedList = convertHashToList(slug, listHash);
        if (convertedList) setCurrentList({ ...convertedList });
        else setCurrentList(JSON.parse(JSON.stringify(storedLists[slug])));
      } else setCurrentList(JSON.parse(JSON.stringify(storedLists[slug])));
    }
    // route '/list/1234' fetches list 1234 from database
    else if (slug !== '' && isValidListId(slug)) {
      setStatus('loading');
      httpClient.get(`${urls.api}/lists/${slug}`)
        .then(response => {
          if (response.data.length > 0) setCurrentList(response.data[0]);
          else setError(`List ${slug} not found.`);
          setStatus('idle');
        })
        .catch(err => {
          setMessage(`Failed to fetch list (id=${slug})`);
          setError(err);
          setStatus('idle');
        });
    }
  }, [slug]);
  useEffect(() => {
    // Save list before unmount
    return () => { if (currentList) updateStoredList(currentList); }
  }, [currentList]);
  useEffect(() => {
    if (width === 'xs' || width === 'sm') {
      setLeftPaneWidth(12);
      setRightPaneWidth(0);
    } else {
      setLeftPaneWidth(6);
      setRightPaneWidth(6);
    }
  }, [width]);
  useEffect(() => {
    if (width === 'xs' || width === 'sm') {
      if (cardPaneFilter.action === 'DISPLAY') {
        setLeftPaneWidth(12);
        setRightPaneWidth(0);
      } else {
        setLeftPaneWidth(0);
        setRightPaneWidth(12);
      }
    }
    setStackSize(1);
    setIsApplyToAll(false);
  }, [width, cardPaneFilter]);
  const reorderUnits = (startIndex, endIndex) => {
    function reorder(arr) {
      const result = Array.from(arr);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    }
    currentList.units = reorder(
      currentList.units, startIndex, endIndex
    );
    currentList.unitObjectStrings = reorder(
      currentList.unitObjectStrings, startIndex, endIndex
    );
    setCurrentList({ ...currentList });
  }
  const handleIncrementStackSize = () => {
    if (stackSize < 12) { setStackSize(stackSize + 1); }
  }
  const handleDecrementStackSize = () => {
    if (stackSize > 1) { setStackSize(stackSize - 1); }
  }
  const handleToggleIsApplyToAll = () => setIsApplyToAll(!isApplyToAll);
  const handleClearList = () => {
    setCardPaneFilter({ action: 'DISPLAY' });
    setCurrentList({ ...listTemplate, faction: currentList.faction });
  }
  const handleChangeTitle = title => setCurrentList({ ...changeListTitle(currentList, title) });
  const handleChangeMode = () => setCurrentList({ ...toggleListMode(currentList) });
  const handleEquipUpgrade = (action, unitIndex, upgradeIndex, upgradeId, isApplyToAll) => {
    setCardPaneFilter({ action: 'DISPLAY' });
    const newList = equipUpgrade(
      currentList, action, unitIndex, upgradeIndex, upgradeId, isApplyToAll
    );
    setCurrentList({ ...newList });
  };
  const handleUnequipUpgrade = (action, unitIndex, upgradeIndex) => {
    setCardPaneFilter({ action: 'DISPLAY' });
    const newList = unequipUpgrade(
      currentList, action, unitIndex, upgradeIndex
    );
    setCurrentList({ ...newList });
  }
  const handleAddUnit = (unitId) => {
    if (width === 'xs' || width === 'sm') {
      setCardPaneFilter({ action: 'DISPLAY' });
    }
    setStackSize(1);
    const newList = addUnit(currentList, unitId, stackSize);
    setCurrentList({ ...newList });
  }
  const handleAddCommand = (commandId) => {
    const newList = addCommand(currentList, commandId);
    setCurrentList({ ...newList });
  }
  const handleRemoveCommand = (commandIndex) => {
    const newList = removeCommand(currentList, commandIndex);
    setCurrentList({ ...newList });
  }
  const handleAddBattle = (type, battleId) => {
    const newList = addBattle(currentList, type, battleId);
    setCurrentList({ ...newList });
  }
  const handleRemoveBattle = (type, battleId) => {
    const newList = removeBattle(currentList, type, battleId);
    setCurrentList({ ...newList });
  }
  const handleAddCounterpart = (unitIndex, counterpartId) => {
    setCardPaneFilter({ action: 'DISPLAY' });
    const newList = addCounterpart(currentList, unitIndex, counterpartId);
    setCurrentList({ ...newList });
  }
  const handleRemoveCounterpart = (unitIndex) => {
    setCardPaneFilter({ action: 'DISPLAY' });
    const newList = removeCounterpart(currentList, unitIndex);
    setCurrentList({ ...newList });
  }
  const handleIncrementUnit = (index) => {
    const newList = incrementUnit(currentList, index);
    setCurrentList({ ...newList });
  }
  const handleDecrementUnit = (index) => {
    if (cardPaneFilter.action.includes('UPGRADE')) {
      setCardPaneFilter({ action: 'DISPLAY' });
    }
    const newList = decrementUnit(currentList, index);
    setCurrentList({ ...newList });
  }
  const handleOpenModal = () => {
    setIsModalOpen(true);
  }
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalContent();
  }
  const handleCardZoom = (cardId) => {
    setModalContent(cardId);
    setIsModalOpen(true);
  }
  const unitProps = {
    getEligibleUnitsToAdd,
    getEquippableUpgrades,
    getEquippableLoadoutUpgrades,
    handleAddUnit,
    handleAddCounterpart,
    handleRemoveCounterpart,
    handleEquipUpgrade,
    handleUnequipUpgrade,
    handleIncrementUnit,
    handleDecrementUnit
  };
  const battleProps = {
    getEligibleBattlesToAdd,
    handleAddBattle,
    handleRemoveBattle
  }
  const commandProps = {
    getEligibleCommandsToAdd,
    handleAddCommand,
    handleRemoveCommand
  };
  const listProps = {
    currentList,
    stackSize,
    reorderUnits,
    isApplyToAll,
    handleClearList,
    handleToggleIsApplyToAll,
    handleChangeTitle,
    handleChangeMode,
    handleIncrementStackSize,
    handleDecrementStackSize
  };
  const modalProps = {
    handleOpenModal,
    handleCloseModal,
    modalContent,
    isModalOpen,
    handleCardZoom
  };
  const viewProps = {
    width,
    cardPaneFilter,
    setCardPaneFilter,
    leftPaneWidth,
    rightPaneWidth,
    setLeftPaneWidth,
    setRightPaneWidth
  };
  if (error) return <ErrorFallback error={error} message={message} />;
  if (status === 'loading') return <LoadingWidget />;
  if (status === 'idle') {
    return (
      <ListContext.Provider
        value={{
          userSettings,
          ...unitProps,
          ...commandProps,
          ...battleProps,
          ...listProps,
          ...modalProps,
          ...viewProps
        }}
      >
        {children}
      </ListContext.Provider>
    );
  }
}

export default ListContext;