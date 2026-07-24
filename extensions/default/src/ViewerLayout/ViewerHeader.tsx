import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Header, Icons, ThemeSelector, useModal } from '@ohif/ui-next';
import { useSystem } from '@ohif/core';
import { Toolbar } from '../Toolbar/Toolbar';
import { preserveQueryParameters } from '@ohif/app';
import { Types } from '@ohif/core';
import ToolbarPanelButtons from './ToolbarPanelButtons';

function ViewerHeader({
  appConfig,
  rightPanelsOnToolbar = false,
  activeToolbarPanelId,
  onToolbarPanelSelect,
}: withAppTypes<{
  appConfig: AppTypes.Config;
  rightPanelsOnToolbar?: boolean;
  activeToolbarPanelId?: string;
  onToolbarPanelSelect?: (panel) => void;
}>) {
  const { servicesManager, extensionManager } = useSystem();
  const { customizationService, panelService } = servicesManager.services;

  const navigate = useNavigate();
  const location = useLocation();

  const onClickReturnButton = () => {
    const { pathname } = location;
    const dataSourceIdx = pathname.indexOf('/', 1);

    const dataSourceName = pathname.substring(dataSourceIdx + 1);
    const existingDataSource = extensionManager.getDataSources(dataSourceName);

    const searchQuery = new URLSearchParams();
    if (dataSourceIdx !== -1 && existingDataSource) {
      searchQuery.append('datasources', pathname.substring(dataSourceIdx + 1));
    }
    preserveQueryParameters(searchQuery);

    navigate({
      pathname: '/',
      search: decodeURIComponent(searchQuery.toString()),
    });
  };

  const { t } = useTranslation();
  const { show } = useModal();

  const AboutModal = customizationService.getCustomization(
    'ohif.aboutModal'
  ) as Types.MenuComponentCustomization;

  const UserPreferencesModal = customizationService.getCustomization(
    'ohif.userPreferencesModal'
  ) as Types.MenuComponentCustomization;

  const menuOptions = [
    {
      title: AboutModal?.menuTitle ?? t('Header:About'),
      icon: 'info',
      onClick: () =>
        show({
          content: AboutModal,
          title: AboutModal?.title ?? t('AboutModal:About OHIF Viewer'),
          containerClassName: AboutModal?.containerClassName ?? 'max-w-md',
        }),
    },
    {
      title: UserPreferencesModal.menuTitle ?? t('Header:Preferences'),
      icon: 'settings',
      onClick: () =>
        show({
          content: UserPreferencesModal,
          title: UserPreferencesModal.title ?? t('UserPreferencesModal:User preferences'),
          containerClassName:
            UserPreferencesModal?.containerClassName ?? 'flex max-w-4xl p-6 flex-col',
        }),
    },
  ];

  if (appConfig.oidc) {
    menuOptions.push({
      title: t('Header:Logout'),
      icon: 'power-off',
      onClick: async () => {
        navigate(`/logout?redirect_uri=${encodeURIComponent(window.location.href)}`);
      },
    });
  }

  const showMobileStudyReports = () => {
    const reportsPanel = panelService
      .getPanels(panelService.PanelPosition.Right)
      .find(panel => panel.name === 'studyReports');

    if (reportsPanel) {
      onToolbarPanelSelect?.(reportsPanel);
    }
  };

  return (
    <Header
      menuOptions={menuOptions}
      isReturnEnabled={!!appConfig.showStudyList}
      onClickReturnButton={onClickReturnButton}
      WhiteLabeling={appConfig.whiteLabeling}
      Branding={<ThemeSelector />}
      Secondary={<Toolbar buttonSection="secondary" />}
    >
      <div className="relative flex items-center justify-center gap-[4px]">
        {rightPanelsOnToolbar && onToolbarPanelSelect && (
          <button
            type="button"
            className="viewer-layout__mobile-report-action"
            onClick={showMobileStudyReports}
            aria-label={t('SidePanel:Reports', 'Reports')}
            data-cy="mobile-study-reports-button"
          >
            <Icons.Clipboard className="h-4 w-4" />
            <span>{t('SidePanel:Reports', 'Reports')}</span>
          </button>
        )}
        <Toolbar buttonSection="primary" />
        {rightPanelsOnToolbar && onToolbarPanelSelect && (
          <ToolbarPanelButtons
            servicesManager={servicesManager}
            activePanelId={activeToolbarPanelId}
            onPanelSelect={onToolbarPanelSelect}
          />
        )}
      </div>
    </Header>
  );
}

export default ViewerHeader;
